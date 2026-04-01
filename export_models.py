"""
Model Export Script for V-2-ROBUST → Arka Energy Nexus HEMS

Run this script AFTER executing all cells in V-2-ROBUST.ipynb.
It exports the trained XGBoost, LightGBM, and Random Forest models
to the HEMS backend's ml_models directory.

Usage (from the notebook or as a standalone script):
    python export_models.py

Prerequisites:
    - V-2-ROBUST.ipynb must have been executed so xgb_model, lgb_model,
      rf_model variables exist in memory.
    - Or run this script independently which retrains from feeds 5.csv.
"""

import os
import sys
import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
import joblib
import warnings
warnings.filterwarnings("ignore")


EXPORT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "BACKEND", "hems_backend", "ml_models"
)

DATA_PATH = os.path.join(
    os.path.expanduser("~"), "Downloads", "feeds 5.csv"
)

FEATURES = [
    "current", "VLL", "VLN", "frequency", "power_factor",
    "hour", "day_of_week", "is_weekend", "month",
    "power_lag_1", "power_lag_5", "power_lag_10",
    "rolling_mean_5", "rolling_std_5",
]
TARGET = "target"


def load_and_clean(path):
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True, errors="coerce")

    drop_cols = ["entry_id", "field7", "field8", "latitude", "longitude", "elevation", "status"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    sensor_cols = ["power", "power_factor", "VLL", "VLN", "current", "frequency"]
    for c in sensor_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    df = df.dropna(subset=["created_at"] + [c for c in sensor_cols if c in df.columns])
    df = df[df["power"] > 0]

    if "power_factor" in df.columns:
        df.loc[df["power_factor"] > 2, "power_factor"] = np.nan
        df["power_factor"] = df["power_factor"].interpolate()

    df = df.sort_values("created_at").reset_index(drop=True)
    return df


def engineer_features(df):
    df = df.set_index("created_at").sort_index()

    df["hour"] = df.index.hour
    df["day_of_week"] = df.index.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["month"] = df.index.month

    df["power_lag_1"] = df["power"].shift(1)
    df["power_lag_5"] = df["power"].shift(5)
    df["power_lag_10"] = df["power"].shift(10)

    df["rolling_mean_5"] = df["power"].rolling(5).mean()
    df["rolling_std_5"] = df["power"].rolling(5).std()

    df["target"] = df["power"].shift(-1)

    df = df.dropna()
    return df


def train_and_export():
    print(f"Loading data from: {DATA_PATH}")
    df = load_and_clean(DATA_PATH)
    print(f"Clean shape: {df.shape}")

    df = engineer_features(df)
    print(f"After feature engineering: {df.shape}")

    split_idx = int(len(df) * 0.8)
    train = df.iloc[:split_idx]
    test = df.iloc[split_idx:]

    X_train, y_train = train[FEATURES], train[TARGET]
    X_test, y_test = test[FEATURES], test[TARGET]

    print(f"Train: {X_train.shape}, Test: {X_test.shape}")

    print("Training XGBoost...")
    xgb_model = xgb.XGBRegressor(
        n_estimators=500, learning_rate=0.05, max_depth=6,
        subsample=0.8, colsample_bytree=0.8,
        early_stopping_rounds=30, random_state=42, n_jobs=-1
    )
    xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=0)
    print("XGBoost trained")

    print("Training LightGBM...")
    lgb_model = lgb.LGBMRegressor(
        n_estimators=500, learning_rate=0.05, max_depth=6,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1
    )
    lgb_model.fit(
        X_train, y_train, eval_set=[(X_test, y_test)],
        eval_metric="rmse",
        callbacks=[lgb.early_stopping(30), lgb.log_evaluation(0)]
    )
    print("LightGBM trained")

    print("Training Random Forest...")
    rf_model = RandomForestRegressor(
        n_estimators=300, max_depth=20, min_samples_split=5,
        min_samples_leaf=2, max_features="sqrt",
        random_state=42, n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    print("Random Forest trained")

    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    for name, model in [("XGBoost", xgb_model), ("LightGBM", lgb_model), ("Random Forest", rf_model)]:
        if name == "LightGBM":
            y_pred = model.predict(X_test)
        else:
            y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        print(f"  {name:16s}: MAE={mae:.4f}  RMSE={rmse:.4f}  R2={r2:.6f}")

    os.makedirs(EXPORT_DIR, exist_ok=True)

    xgb_path = os.path.join(EXPORT_DIR, "xgb_power.json")
    lgb_path = os.path.join(EXPORT_DIR, "lgb_power.txt")
    rf_path = os.path.join(EXPORT_DIR, "rf_power.joblib")

    xgb_model.save_model(xgb_path)
    print(f"Saved XGBoost  -> {xgb_path}")

    lgb_model.booster_.save_model(lgb_path)
    print(f"Saved LightGBM -> {lgb_path}")

    joblib.dump(rf_model, rf_path)
    print(f"Saved Random Forest -> {rf_path}")

    print("All models exported successfully!")


if __name__ == "__main__":
    train_and_export()
