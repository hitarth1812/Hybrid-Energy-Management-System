# ESG Report Generator - Aggregate-Only Refactoring

## Overview
The ESG report generator has been refactored to work **exclusively with building-level aggregate predictions** instead of per-device predictions. This aligns with the ML model constraint: the ensemble models ONLY output two predictions at the building level:
1. **Total Load (kW)** - Aggregate power consumption for entire building
2. **Light + Appliance Load (kW)** - Combined predictable load category

## Key Changes

### New Helper Functions

#### `_build_aggregate_features(building: Building) -> Tuple[Dict[str, float], Dict[str, Any]]`
- **Purpose**: Builds feature vector for building-level prediction
- **Input**: Building object
- **Process**:
  - Aggregates building metrics: room count, area (sqft), occupancy
  - Collects historical usage data from ALL devices in building
  - Calculates aggregate power series (energy/hours for all devices combined)
  - Generates lag features: power_lag_1, power_lag_5, power_lag_10
  - Generates rolling features: rolling_mean_5, rolling_std_5
  - Applies time features: hour, day_of_week, is_weekend, month
  - Assumes electrical parameters (VLL=415V, VLN=240V, PF=0.9, freq=50Hz)
- **Returns**: (features_dict, sensor_row)

#### `_predict_aggregates(building: Building, models: Dict[str, Any]) -> Dict[str, Any]`
- **Purpose**: Runs ensemble prediction for ONE building
- **Input**: Building object and model bundles (power models, light models)
- **Process**:
  1. Calls `_build_aggregate_features()` to get features
  2. Runs TOTAL power prediction through ensemble:
     - XGBoost total_power model
     - LightGBM total_power model
     - Random Forest total_power model
     - Returns ensemble average (equal-weight)
  3. Runs LIGHT+APPLIANCE prediction through ensemble:
     - XGBoost light model
     - LightGBM light model
     - Random Forest light model
     - Returns ensemble average
  4. Derives HEAVY_LOAD = total - light_appliance
  5. Calculates ratios: light_ratio = light_appliance/total, heavy_ratio = heavy/total
  6. Computes ensemble confidence: 1.0 - (spread / total_kw)
- **Returns**: {total_kw, light_appliance_kw, heavy_load_kw, light_ratio, heavy_ratio, sensor, ensemble_spreads}

### Modified Function: `generate_esg_report(user) -> BytesIO`

**Before**: Iterated through all devices, ran per-device ML predictions, aggregated to building level
**After**: Iterates through buildings only, runs ONE prediction per building

#### Data Processing Changes
- **Input Processing**: Changed from device iteration to building iteration
- **Prediction**: One `_predict_aggregates()` call per building (not per device)
- **Anomaly Detection**: Building-level only:
  - High Load Zone: if total_kw > peak_threshold_kw (default 15 kW)
  - Excessive Lighting: if light_ratio > 0.7 (70%)
  - Heavy Machinery Overload: if heavy_ratio > 0.8 (80%)
- **Derived Metrics**:
  - kw_per_area = total_kw / area_sqft
  - kw_per_occupant = total_kw / occupancy
  - Efficiency Score = (baseline_kw / total_kw) × 100, capped 0-100

#### Building Row Structure (NEW)
```python
{
    "name": str,
    "rooms": int,
    "area_sqft": float,
    "occupancy": int,
    "total_kw": float,
    "light_appliance_kw": float,
    "heavy_load_kw": float,
    "light_ratio_pct": float,
    "heavy_ratio_pct": float,
    "kw_per_area": float,
    "kw_per_occupant": float,
    "monthly_kwh_total": float,
    "monthly_kwh_light": float,
    "monthly_kwh_heavy": float,
    "monthly_co2": float,
    "monthly_co2_light": float,
    "monthly_co2_heavy": float,
    "monthly_cost": float,
    "efficiency_score": float,
    "sensor": dict,
    "ensemble_confidence": float,
}
```

#### Organization-Level Metrics (NEW)
- `total_org_kw` - Sum of all building total_kw
- `total_org_light_appliance_kw` - Sum of all building light_appliance_kw
- `total_org_heavy_kw` - Sum of all building heavy_load_kw
- `org_monthly_kwh`, `org_monthly_co2`, `org_monthly_cost`
- `org_efficiency` - Based on org_light_ratio and org_heavy_ratio
- `org_light_ratio`, `org_heavy_ratio`

### PDF Report Changes (12 Pages)

#### Pages 1-2: Cover & Executive Summary
- ✅ Updated to show org-level aggregate metrics
- ✅ Removed "Total Devices" (N/A in aggregate model)
- ✅ Removed per-device efficiency rankings

#### Page 3: Building Load Analysis Table
- ✅ NEW: Shows each building with load composition
- Columns: Building, Rooms, Total kW, Light %, Heavy %, Monthly CO2, Eff. Score
- ✅ Removed "Devices" column (N/A in aggregate model)

#### Page 4: Organization Load Composition Pie Chart
- ✅ NEW: Shows light vs heavy load split at org level
- Visual: Pie chart with percentages

#### Page 5: Building Total Power Chart
- ✅ Updated: Shows all buildings ranked by total_kw
- ✅ Color-coded by efficiency score

#### Page 6: Load Composition by Building (Stacked)
- ✅ NEW: Stacked bar chart showing light vs heavy for each building

#### Page 7: Monthly CO2 Projection by Load Type
- ✅ NEW: Stacked bar chart for CO2 light vs heavy per building

#### Page 8: Efficiency Gauge
- ✅ Updated: Shows building-level efficiency scores with benchmark lines

#### Page 9: Anomalies & Energy Insights
- ✅ Updated: Shows building-level anomalies detected
- ✅ Recommendations tailored to building-level findings

#### Page 10: Building Load Intensity Analysis
- ✅ NEW: Table with kW/sqft, kW/person metrics

#### Page 11: Building Sensor Readings & Model Confidence
- ✅ Updated: Shows sensor readings for each building (aggregated)
- ✅ Shows ensemble confidence per building

#### Page 12: Methodology & Configuration
- ✅ Updated: Explains aggregate-only approach
- ✅ Removed per-device feature engineering explanation
- ✅ Added disclaimer about ML-based estimates

## Data Flow Validation

### Before Refactoring (Per-Device)
```
Buildings
  → Rooms
    → Devices (50-100 per building)
      → Per-device features
        → Per-device predictions
          → Aggregate to building
            → Aggregate to org
              → PDF report
```

### After Refactoring (Aggregate-Only)
```
Buildings (5-10 per org)
  → Aggregate features from all devices
    → Building-level predictions (1 per building)
      → Aggregate to org
        → PDF report
```

## Compliance Checklist

- ✅ NO per-device predictions anywhere
- ✅ NO iteration through devices in report generation
- ✅ NO device-level tables in PDF
- ✅ ONLY building-level metrics in output
- ✅ ML models provide exactly 2 outputs: total_kw, light_appliance_kw
- ✅ Heavy_load_kw derived mathematically (total - light_appliance)
- ✅ All anomalies at building level
- ✅ All recommendations based on aggregate building data
- ✅ Model confidence calculated from ensemble spread
- ✅ No hallucinated device-level data

## Configuration Parameters

All settings in Django `settings.py`:
```python
ESG_CO2_FACTOR = 0.82  # kg CO2/kWh
ESG_COST_PER_KWH = 8.0  # INR/kWh
ESG_HOURS_PER_MONTH = 720  # hours
ESG_EFFICIENCY_BASELINE_KW = 5.0  # kW
ESG_PEAK_THRESHOLD_KW = 15.0  # kW (for high load anomaly)
```

## Testing Recommendations

1. **Generate test report**:
   ```python
   from energy.esg_report import generate_esg_report
   user = User.objects.first()
   buffer = generate_esg_report(user)
   # Verify building_rows populated correctly
   # Verify NO device references in output
   # Verify CO2, cost, efficiency calculations
   ```

2. **Verify aggregate features**:
   - Check that `_build_aggregate_features()` sums all device power correctly
   - Verify lag features calculated from aggregate series

3. **Verify predictions**:
   - Check that `_predict_aggregates()` returns only 2 predictions
   - Verify heavy_load_kw = total_kw - light_appliance_kw always
   - Verify ensemble confidence in [0, 1] range

4. **Verify PDF rendering**:
   - All 12 pages render without errors
   - All charts render correctly
   - No references to devices in tables
   - All calculations match expected formulas

## Backward Compatibility

- **BREAKING CHANGE**: This refactoring removes all per-device prediction functionality
- **API Change**: `generate_esg_report()` now only accepts user parameter (no device list)
- **Data Change**: building_rows structure completely different (removed old device metrics)
- **Recommendation**: Do NOT revert partially - entire codebase depends on aggregate model

## Future Enhancements

1. Per-room predictions (aggregating rooms within building)
2. Time-series forecasting at building level
3. Anomaly prediction alerts
4. Seasonal efficiency benchmarking
5. Comparative analysis across buildings
