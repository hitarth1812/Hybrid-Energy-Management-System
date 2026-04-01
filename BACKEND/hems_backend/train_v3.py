import warnings; warnings.filterwarnings('ignore')
import os, numpy as np, pandas as pd
import xgboost as xgb, lightgbm as lgb, joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

DATA_PATH  = r'C:\Users\Hitarth Khatiwala\Downloads\feeds 5.csv'
EXPORT_DIR = r'C:\Users\Hitarth Khatiwala\HEMS\BACKEND\hems_backend\ml_models'
SENSOR_COLS= ['power','power_factor','VLL','VLN','current','frequency']
DROP_COLS  = ['entry_id','field7','field8','latitude','longitude','elevation','status']
LAG_STEPS  = [1,5,10]; ROLLING_WIN=5; TRAIN_RATIO=0.80
FEATURES   = ['current','VLL','VLN','frequency','power_factor',
              'hour','day_of_week','is_weekend','month',
              'power_lag_1','power_lag_5','power_lag_10',
              'rolling_mean_5','rolling_std_5']
TARGET = 'target'

print('Loading data...')
df = pd.read_csv(DATA_PATH)
df.columns = [c.strip() for c in df.columns]
df['created_at'] = pd.to_datetime(df['created_at'], utc=True, errors='coerce')
df.drop(columns=[c for c in DROP_COLS if c in df.columns], inplace=True)
for col in SENSOR_COLS:
    if col in df.columns: df[col] = pd.to_numeric(df[col], errors='coerce')
df.dropna(subset=['created_at']+[c for c in SENSOR_COLS if c in df.columns], inplace=True)
df = df[df['power'] > 0].copy()
df = df.set_index('created_at').sort_index()
if 'power_factor' in df.columns:
    df.loc[df['power_factor'] > 2, 'power_factor'] = np.nan
    df['power_factor'] = df['power_factor'].interpolate(method='time')
print(f'Clean shape: {df.shape}')

def eng(s):
    d = s.copy()
    d['hour'] = d.index.hour
    d['day_of_week'] = d.index.dayofweek
    d['is_weekend'] = (d['day_of_week'] >= 5).astype(int)
    d['month'] = d.index.month
    for lag in LAG_STEPS:
        d[f'power_lag_{lag}'] = d['power'].shift(lag)
    d['rolling_mean_5'] = d['power'].rolling(ROLLING_WIN).mean()
    d['rolling_std_5'] = d['power'].rolling(ROLLING_WIN).std()
    d[TARGET] = d['power'].shift(-1)
    d.dropna(inplace=True)
    return d

split = int(len(df) * TRAIN_RATIO)
df_train = eng(df.iloc[:split])
df_test = eng(df.iloc[split:])
X_train, y_train = df_train[FEATURES], df_train[TARGET]
X_test, y_test = df_test[FEATURES], df_test[TARGET]
print(f'Train: {X_train.shape}, Test: {X_test.shape}')

print('Training XGBoost...')
m_xgb = xgb.XGBRegressor(
    n_estimators=300, learning_rate=0.05, max_depth=5,
    subsample=0.8, colsample_bytree=0.8,
    min_child_weight=5, reg_lambda=1.5,
    eval_metric='rmse', early_stopping_rounds=30,
    random_state=42, n_jobs=-1, verbosity=0)
m_xgb.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=0)
print('XGBoost done')

print('Training LightGBM...')
m_lgb = lgb.LGBMRegressor(
    n_estimators=300, learning_rate=0.05, max_depth=5,
    subsample=0.8, colsample_bytree=0.8,
    min_child_samples=20, reg_lambda=1.5,
    random_state=42, n_jobs=-1, verbose=-1)
m_lgb.fit(X_train, y_train, eval_set=[(X_test, y_test)],
          callbacks=[lgb.early_stopping(30), lgb.log_evaluation(0)])
print('LightGBM done')

print('Training Random Forest...')
m_rf = RandomForestRegressor(
    n_estimators=200, max_depth=12,
    min_samples_split=10, min_samples_leaf=4,
    max_features='sqrt', random_state=42, n_jobs=-1)
m_rf.fit(X_train, y_train)
print('Random Forest done')

for name, m in [('XGBoost', m_xgb), ('LightGBM', m_lgb), ('RF', m_rf)]:
    p = m.predict(X_test)
    mae = mean_absolute_error(y_test, p)
    rmse = float(np.sqrt(mean_squared_error(y_test, p)))
    var = np.var(y_test)
    r2 = 1 - np.sum((y_test - p)**2) / np.sum((y_test - np.mean(y_test))**2) if var > 1e-6 else float('nan')
    print(f'  {name:10s} MAE={mae:.4f} RMSE={rmse:.4f} R2={r2:.6f}')

os.makedirs(EXPORT_DIR, exist_ok=True)
m_xgb.save_model(os.path.join(EXPORT_DIR, 'xgb_power.json'))
m_lgb.booster_.save_model(os.path.join(EXPORT_DIR, 'lgb_power.txt'))
joblib.dump(m_rf, os.path.join(EXPORT_DIR, 'rf_power.joblib'))
print('All models exported to ' + EXPORT_DIR)
