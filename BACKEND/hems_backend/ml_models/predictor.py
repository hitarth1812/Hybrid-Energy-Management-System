import os
import logging
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from django.conf import settings

logger = logging.getLogger(__name__)

BASE = os.path.dirname(__file__)
XGB_PATH = os.path.join(BASE, "xgb_power.json")
LGB_PATH = os.path.join(BASE, "lgb_power.txt")
XGB_Q10_PATH = os.path.join(BASE, "xgb_q10.json")
XGB_Q90_PATH = os.path.join(BASE, "xgb_q90.json")

# Load models once at Django startup — with graceful fallback on missing files
# [H4] ML MODEL STARTUP — WITH OPTIONAL QUANTILE MODELS
_xgb = None
_lgb = None
_xgb_q10 = None  # P10 quantile model for lower confidence interval
_xgb_q90 = None  # P90 quantile model for upper confidence interval
FEATURES = []

try:
    _xgb = xgb.XGBRegressor()
    _xgb.load_model(XGB_PATH)
    FEATURES = _xgb.get_booster().feature_names
    logger.info("XGBoost model loaded successfully.")
except Exception as e:
    logger.error(f"XGBoost model load failed: {e}")
    _xgb = None

try:
    _lgb = lgb.Booster(model_file=LGB_PATH)
    # If XGB failed but LGB succeeded, derive feature names from LGB
    if not FEATURES:
        FEATURES = _lgb.feature_name()
    logger.info("LightGBM model loaded successfully.")
except Exception as e:
    logger.error(f"LightGBM model load failed: {e}")
    _lgb = None

# Load quantile models for prediction intervals (optional)
try:
    _xgb_q10 = xgb.XGBRegressor()
    _xgb_q10.load_model(XGB_Q10_PATH)
    logger.info("XGBoost Q10 model loaded successfully.")
except Exception as e:
    logger.warning(f"XGBoost Q10 model load failed (optional): {e}")
    _xgb_q10 = None

try:
    _xgb_q90 = xgb.XGBRegressor()
    _xgb_q90.load_model(XGB_Q90_PATH)
    logger.info("XGBoost Q90 model loaded successfully.")
except Exception as e:
    logger.warning(f"XGBoost Q90 model load failed (optional): {e}")
    _xgb_q90 = None

# Optuna-tuned ensemble weight (loaded at startup, default fallback)
# Update this value after running Optuna optimization in the notebook
OPTUNA_XGB_W = float(os.getenv("OPTUNA_XGB_WEIGHT", 0.45))
OPTUNA_LGB_W = 1.0 - OPTUNA_XGB_W

# Confidence interval classification thresholds (kW)
CONFIDENCE_THRESHOLD_HIGH = 5.0   # interval_width < 5 = HIGH
CONFIDENCE_THRESHOLD_MEDIUM = 15.0  # interval_width < 15 = MEDIUM, else LOW


def _get_confidence_level(interval_width: float) -> str:
    """
    Classify confidence level based on prediction interval width.
    
    Args:
        interval_width: P90 - P10 of prediction interval (in kW)
        
    Returns:
        "HIGH", "MEDIUM", or "LOW"
    """
    if interval_width < CONFIDENCE_THRESHOLD_HIGH:
        return "HIGH"
    elif interval_width < CONFIDENCE_THRESHOLD_MEDIUM:
        return "MEDIUM"
    else:
        return "LOW"


def predict(feature_dict: dict) -> dict:
    """
    Returns prediction dict with point estimates, prediction intervals (P10-P90),
    and confidence classification. Falls back gracefully when models unavailable.
    
    Returns:
        {
            "predicted_power_kw": float,        # Ensemble median prediction
            "predicted_co2_kg": float,          # CO2 emissions scaled from power
            "p10_kw": float,                    # 10th percentile (lower CI bound)
            "p90_kw": float,                    # 90th percentile (upper CI bound)
            "interval_width": float,            # P90 - P10 (uncertainty measure)
            "confidence": str,                  # "HIGH", "MEDIUM", "LOW"
            "xgb_kw": float,                    # XGBoost prediction (debug)
            "lgb_kw": float,                    # LightGBM prediction (debug)
            "error": str (optional),            # Error message if prediction fails
            "fallback": bool (optional),        # True if using fallback behavior
        }
    """
    if _xgb is None or _lgb is None:
        return {"error": "ML model unavailable", "fallback": True}

    # ===== SAFETY CHECK: Validate no target leakage features =====
    if "kVA" in feature_dict:
        logger.warning("Input contains 'kVA' feature — possible target leakage detected. Removing.")
        feature_dict = {k: v for k, v in feature_dict.items() if k != "kVA"}

    # ===== BUILD FEATURE ROW with safe NaN handling =====
    try:
        row = np.array([[feature_dict.get(f, np.nan) for f in FEATURES]])
        
        # Fill any NaNs with zeros as safety fallback (in production, should use train medians)
        row = np.nan_to_num(row, nan=0.0)
    except Exception as e:
        logger.error(f"Feature extraction failed: {e}")
        return {"error": f"Feature extraction error: {e}", "fallback": True}

    # ===== POINT ESTIMATES: Mean predictions =====
    try:
        xgb_pred = float(_xgb.predict(row)[0])
        lgb_pred = float(_lgb.predict(row)[0])
    except Exception as e:
        logger.error(f"Model prediction failed: {e}")
        return {"error": f"Model prediction error: {e}", "fallback": True}

    # Apply Optuna-tuned ensemble weights
    final_kw = OPTUNA_XGB_W * xgb_pred + OPTUNA_LGB_W * lgb_pred

    # ===== PREDICTION INTERVALS: Quantile predictions =====
    p10_kw = final_kw  # Fallback: use point estimate
    p90_kw = final_kw
    
    if _xgb_q10 is not None:
        try:
            p10_kw = float(_xgb_q10.predict(row)[0])
        except Exception as e:
            logger.warning(f"Q10 quantile prediction failed: {e}")
    
    if _xgb_q90 is not None:
        try:
            p90_kw = float(_xgb_q90.predict(row)[0])
        except Exception as e:
            logger.warning(f"Q90 quantile prediction failed: {e}")

    # Ensure P10 < P90 (swap if reversed due to model issues)
    if p10_kw > p90_kw:
        p10_kw, p90_kw = p90_kw, p10_kw

    interval_width = p90_kw - p10_kw
    confidence_level = _get_confidence_level(interval_width)

    # ===== EMISSIONS SCALING =====
    emission_factor = getattr(settings, "EMISSION_FACTOR", 0.82)
    co2_kg = final_kw * emission_factor

    # ===== RETURN ENRICHED PREDICTION =====
    return {
        "predicted_power_kw": round(final_kw, 3),
        "predicted_co2_kg": round(co2_kg, 3),
        "p10_kw": round(p10_kw, 3),
        "p90_kw": round(p90_kw, 3),
        "interval_width": round(interval_width, 3),
        "confidence": confidence_level,
        "xgb_kw": round(xgb_pred, 3),
        "lgb_kw": round(lgb_pred, 3),
    }
