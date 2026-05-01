import os
import logging
import numpy as np
import xgboost as xgb
import lightgbm as lgb
import joblib
from django.conf import settings

logger = logging.getLogger(__name__)

BASE = os.path.dirname(__file__)
XGB_PATH = os.path.join(BASE, "xgb_power.json")
LGB_PATH = os.path.join(BASE, "lgb_power.txt")
RF_PATH = os.path.join(BASE, "rf_power.joblib")

XGB_LIGHT_PATH = os.path.join(BASE, "xgb_light.json")
LGB_LIGHT_PATH = os.path.join(BASE, "lgb_light.txt")
RF_LIGHT_PATH = os.path.join(BASE, "rf_light.joblib")

FEATURES = [
    "current", "VLL", "VLN", "frequency", "power_factor",
    "hour", "day_of_week", "is_weekend", "month",
    "power_lag_1", "power_lag_5", "power_lag_10",
    "rolling_mean_5", "rolling_std_5",
]

_xgb = None
_lgb = None
_rf = None

try:
    _xgb = xgb.XGBRegressor()
    _xgb.load_model(XGB_PATH)
    logger.info("XGBoost model loaded successfully.")
except Exception as e:
    logger.error(f"XGBoost model load failed: {e}")
    _xgb = None

try:
    # Temporarily disable LightGBM loading due to model file corruption
    # _lgb = lgb.Booster(model_file=LGB_PATH)
    logger.warning("LightGBM model loading skipped (corrupted model files)")
    _lgb = None
except Exception as e:
    logger.error(f"LightGBM model load failed: {e}")
    _lgb = None

try:
    _rf = joblib.load(RF_PATH)
    logger.info("Random Forest model loaded successfully.")
except Exception as e:
    logger.warning(f"Random Forest model load failed (optional): {e}")
    _rf = None

_xgb_light = None
_lgb_light = None
_rf_light = None

try:
    _xgb_light = xgb.XGBRegressor()
    _xgb_light.load_model(XGB_LIGHT_PATH)
    logger.info("XGBoost Light model loaded.")
except Exception as e:
    logger.error(f"XGBoost Light load failed: {e}")

try:
    # Temporarily disable LightGBM Light loading due to model file corruption
    # _lgb_light = lgb.Booster(model_file=LGB_LIGHT_PATH)
    logger.warning("LightGBM Light model loading skipped (corrupted model files)")
    _lgb_light = None
except Exception as e:
    logger.error(f"LightGBM Light load failed: {e}")
    _lgb_light = None

try:
    _rf_light = joblib.load(RF_LIGHT_PATH)
    logger.info("Random Forest Light model loaded.")
except Exception:
    pass

XGB_W = float(os.getenv("ENSEMBLE_XGB_WEIGHT", 0.30))
LGB_W = float(os.getenv("ENSEMBLE_LGB_WEIGHT", 0.40))
RF_W = float(os.getenv("ENSEMBLE_RF_WEIGHT", 0.30))


def predict(feature_dict: dict) -> dict:
    if _xgb is None and _lgb is None and _rf is None:
        return {"error": "ML models unavailable", "fallback": True}

    try:
        row = np.array([[feature_dict.get(f, 0.0) for f in FEATURES]])
        row = np.nan_to_num(row, nan=0.0)
    except Exception as e:
        logger.error(f"Feature extraction failed: {e}")
        return {"error": f"Feature extraction error: {e}", "fallback": True}

    preds = {}
    weights = {}
    total_weight = 0.0

    if _xgb is not None:
        try:
            preds["xgb"] = float(_xgb.predict(row)[0])
            weights["xgb"] = XGB_W
            total_weight += XGB_W
        except Exception as e:
            logger.warning(f"XGBoost prediction failed: {e}")

    if _lgb is not None:
        try:
            preds["lgb"] = float(_lgb.predict(row)[0])
            weights["lgb"] = LGB_W
            total_weight += LGB_W
        except Exception as e:
            logger.warning(f"LightGBM prediction failed: {e}")

    if _rf is not None:
        try:
            preds["rf"] = float(_rf.predict(row)[0])
            weights["rf"] = RF_W
            total_weight += RF_W
        except Exception as e:
            logger.warning(f"Random Forest prediction failed: {e}")

    if not preds:
        return {"error": "All model predictions failed", "fallback": True}

    if total_weight > 0:
        final_kw = sum(preds[k] * weights[k] for k in preds) / total_weight
    else:
        final_kw = np.mean(list(preds.values()))

    pred_values = list(preds.values())
    spread = max(pred_values) - min(pred_values) if len(pred_values) > 1 else 0.0

    if spread < 1.0:
        confidence = "HIGH"
    elif spread < 3.0:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    emission_factor = getattr(settings, "EMISSION_FACTOR", 0.82)
    co2_kg = final_kw * emission_factor

    result = {
        "predicted_power_kw": round(final_kw, 3),
        "predicted_co2_kg": round(co2_kg, 3),
        "confidence": confidence,
        "model_spread": round(spread, 3),
    }

    if "xgb" in preds:
        result["xgb_kw"] = round(preds["xgb"], 3)
    if "lgb" in preds:
        result["lgb_kw"] = round(preds["lgb"], 3)
    if "rf" in preds:
        result["rf_kw"] = round(preds["rf"], 3)

    return result

def predict_light(feature_dict: dict) -> dict:
    if _xgb_light is None and _lgb_light is None and _rf_light is None:
        return {"error": "Light ML models unavailable", "fallback": True}

    try:
        row = np.array([[feature_dict.get(f, 0.0) for f in FEATURES]])
        row = np.nan_to_num(row, nan=0.0)
    except Exception as e:
        return {"error": f"Feature extraction error: {e}", "fallback": True}

    preds = {}
    weights = {}
    total_weight = 0.0

    if _xgb_light is not None:
        try:
            preds["xgb"] = float(_xgb_light.predict(row)[0])
            weights["xgb"] = XGB_W
            total_weight += XGB_W
        except Exception:
            pass

    if _lgb_light is not None:
        try:
            preds["lgb"] = float(_lgb_light.predict(row)[0])
            weights["lgb"] = LGB_W
            total_weight += LGB_W
        except Exception:
            pass

    if _rf_light is not None:
        try:
            preds["rf"] = float(_rf_light.predict(row)[0])
            weights["rf"] = RF_W
            total_weight += RF_W
        except Exception:
            pass

    if not preds:
        return {"error": "All light model predictions failed", "fallback": True}

    if total_weight > 0:
        final_kw = sum(preds[k] * weights[k] for k in preds) / total_weight
    else:
        final_kw = np.mean(list(preds.values()))

    pred_values = list(preds.values())
    spread = max(pred_values) - min(pred_values) if len(pred_values) > 1 else 0.0
    
    if spread < 1.0:
        confidence = "HIGH"
    elif spread < 3.0:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    emission_factor = getattr(settings, "EMISSION_FACTOR", 0.82)
    co2_kg = final_kw * emission_factor

    result = {
        "predicted_power_kw": round(final_kw, 3),
        "predicted_co2_kg": round(co2_kg, 3),
        "confidence": confidence,
        "model_spread": round(spread, 3),
    }

    if "xgb" in preds:
        result["xgb_kw"] = round(preds["xgb"], 3)
    if "lgb" in preds:
        result["lgb_kw"] = round(preds["lgb"], 3)
    if "rf" in preds:
        result["rf_kw"] = round(preds["rf"], 3)

    return result
