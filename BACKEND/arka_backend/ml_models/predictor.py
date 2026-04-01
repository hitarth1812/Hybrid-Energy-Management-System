import os
import numpy as np
import xgboost as xgb
import lightgbm as lgb
import joblib

BASE = os.path.dirname(__file__)

_xgb = xgb.XGBRegressor()
_xgb.load_model(os.path.join(BASE, "xgb_power.json"))

_lgb = lgb.Booster(model_file=os.path.join(BASE, "lgb_power.txt"))

FEATURES = [
    "current", "VLL", "VLN", "frequency", "power_factor",
    "hour", "day_of_week", "is_weekend", "month",
    "power_lag_1", "power_lag_5", "power_lag_10",
    "rolling_mean_5", "rolling_std_5",
]

XGB_W = 0.30
LGB_W = 0.40
RF_W = 0.30

_rf = None
try:
    _rf = joblib.load(os.path.join(BASE, "rf_power.joblib"))
except Exception:
    _rf = None


def predict(feature_dict: dict) -> dict:
    row = np.array([[feature_dict.get(f, 0.0) for f in FEATURES]])
    xgb_pred = float(_xgb.predict(row)[0])
    lgb_pred = float(_lgb.predict(row)[0])

    if _rf is not None:
        rf_pred = float(_rf.predict(row)[0])
        total_w = XGB_W + LGB_W + RF_W
        final_kw = (XGB_W * xgb_pred + LGB_W * lgb_pred + RF_W * rf_pred) / total_w
    else:
        final_kw = 0.40 * xgb_pred + 0.60 * lgb_pred

    result = {
        "predicted_power_kw": round(final_kw, 3),
        "predicted_co2_kg": round(final_kw * 0.82, 3),
        "xgb_kw": round(xgb_pred, 3),
        "lgb_kw": round(lgb_pred, 3),
    }
    if _rf is not None:
        result["rf_kw"] = round(rf_pred, 3)
    return result
