import os
import numpy as np
import xgboost as xgb
import lightgbm as lgb

BASE = os.path.dirname(__file__)

# Load models once at Django startup
_xgb = xgb.XGBRegressor()
_xgb.load_model(os.path.join(BASE, "xgb_power.json"))

_lgb = lgb.Booster(model_file=os.path.join(BASE, "lgb_power.txt"))

# Feature names are already inside the model files
FEATURES = _xgb.get_booster().feature_names

# Best blend from notebook: 40% XGB + 60% LGB
XGB_W = 0.4
LGB_W = 0.6


def predict(feature_dict: dict) -> dict:
    row = np.array([[feature_dict[f] for f in FEATURES]])
    xgb_pred = float(_xgb.predict(row)[0])
    lgb_pred = float(_lgb.predict(row)[0])
    final_kw = XGB_W * xgb_pred + LGB_W * lgb_pred
    return {
        "predicted_power_kw": round(final_kw, 3),
        "predicted_co2_kg": round(final_kw * 0.82, 3),
        "xgb_kw": round(xgb_pred, 3),
        "lgb_kw": round(lgb_pred, 3),
    }
