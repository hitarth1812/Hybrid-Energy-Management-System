from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from io import BytesIO
from statistics import median
from typing import Any, Dict, List, Tuple

import joblib
import lightgbm as lgb
import matplotlib
import numpy as np
import xgboost as xgb
from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Building, Device, OutputLog, PredictionLog, Room, UsageLog

matplotlib.use("Agg")
import matplotlib.pyplot as plt

FEATURES = [
    "current", "VLL", "VLN", "frequency", "power_factor",
    "hour", "day_of_week", "is_weekend", "month",
    "power_lag_1", "power_lag_5", "power_lag_10",
    "rolling_mean_5", "rolling_std_5",
]

LIGHT_DEVICE_HINTS = {"LIGHT", "LED", "LAMP", "BULB", "TUBE", "APPLIANCE", "FAN"}

XGB_POWER = "xgb_power.json"
LGB_POWER = "lgb_power.txt"
RF_POWER = "rf_power.joblib"
XGB_LIGHT = "xgb_light.json"
LGB_LIGHT = "lgb_light.txt"
RF_LIGHT = "rf_light.joblib"


def _safe_float(value: Any, default: float) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _org_name(user) -> str:
    email = getattr(user, "email", "") or ""
    if "@" in email:
        domain = email.split("@", 1)[1]
        return domain.split(".")[0].upper()
    return getattr(user, "username", "ARKA") or "ARKA"


def _get_accessible_buildings(user) -> List[Building]:
    # Current schema has no building ownership field; return all buildings for authenticated users.
    return list(Building.objects.all().order_by("name"))


def _is_device_active(device: Device) -> bool:
    meta = device.metadata if isinstance(device.metadata, dict) else {}
    return bool(meta.get("is_active", True))


def _is_light_device(device: Device) -> bool:
    device_type = (device.device_type or "").upper()
    if any(hint in device_type for hint in LIGHT_DEVICE_HINTS):
        return True
    category_name = ((device.category.name if device.category else "") or "").upper()
    return any(hint in category_name for hint in LIGHT_DEVICE_HINTS)


def _load_models(model_type: str) -> Dict[str, Any]:
    models_dir = getattr(settings, "ML_MODELS_DIR", settings.BASE_DIR / "ml_models")
    if model_type == "light":
        xgb_file, lgb_file, rf_file = XGB_LIGHT, LGB_LIGHT, RF_LIGHT
    else:
        xgb_file, lgb_file, rf_file = XGB_POWER, LGB_POWER, RF_POWER

    loaded: Dict[str, Any] = {}

    try:
        model_xgb = xgb.XGBRegressor()
        model_xgb.load_model(str(models_dir / xgb_file))
        loaded["xgb"] = model_xgb
    except Exception:
        pass

    try:
        loaded["lgb"] = lgb.Booster(model_file=str(models_dir / lgb_file))
    except Exception:
        pass

    try:
        loaded["rf"] = joblib.load(str(models_dir / rf_file))
    except Exception:
        pass

    return loaded


def _extract_power_history(device: Device, lookback: int = 12) -> List[Dict[str, Any]]:
    # Primary source: UsageLog (energy over date). Secondary source: OutputLog.
    usage_qs = list(UsageLog.objects.filter(device=device).order_by("-date")[:lookback])
    rows: List[Dict[str, Any]] = []

    for u in reversed(usage_qs):
        hours = _safe_float(u.hours_used, 0.0)
        if hours > 0 and u.energy_kwh is not None:
            power_kw = _safe_float(u.energy_kwh, 0.0) / hours
        else:
            power_kw = (_safe_float(device.watt_rating, 0.0) * max(1, int(device.quantity or 1))) / 1000.0

        rows.append({
            "timestamp": datetime.combine(u.date, datetime.min.time()),
            "power_kw": max(power_kw, 0.0),
        })

    if len(rows) < lookback:
        out_qs = list(OutputLog.objects.filter(device=device).order_by("-timestamp")[:lookback])
        for o in reversed(out_qs):
            rows.append({
                "timestamp": o.timestamp,
                "power_kw": max(_safe_float(o.output_value, 0.0), 0.0),
            })

    rows = sorted(rows, key=lambda r: r["timestamp"])
    return rows[-lookback:]


def _build_features(device: Device, power_rows: List[Dict[str, Any]]) -> Tuple[Dict[str, float], Dict[str, Any]]:
    default_kw = (_safe_float(device.watt_rating, 0.0) * max(1, int(device.quantity or 1))) / 1000.0
    if default_kw <= 0:
        default_kw = 1.0

    if not power_rows:
        now = timezone.now()
        power_series = [default_kw] * 10
        latest_ts = now
    else:
        latest_ts = power_rows[-1]["timestamp"]
        power_series = [max(_safe_float(r["power_kw"], default_kw), 0.0) for r in power_rows]

    while len(power_series) < 10:
        power_series.insert(0, power_series[0] if power_series else default_kw)

    lag_candidates = {
        "power_lag_1": power_series[-1],
        "power_lag_5": power_series[-5] if len(power_series) >= 5 else np.nan,
        "power_lag_10": power_series[-10] if len(power_series) >= 10 else np.nan,
        "rolling_mean_5": float(np.mean(power_series[-5:])),
        "rolling_std_5": float(np.std(power_series[-5:])),
    }

    median_power = float(median(power_series)) if power_series else default_kw
    for key, value in list(lag_candidates.items()):
        if value is None or (isinstance(value, float) and np.isnan(value)):
            lag_candidates[key] = median_power

    dt = latest_ts if timezone.is_aware(latest_ts) else timezone.make_aware(latest_ts)
    hour = dt.hour
    dow = dt.weekday()
    is_weekend = 1 if dow >= 5 else 0

    pf = 0.9
    vll = 415.0
    vln = 240.0
    freq = 50.0

    latest_kw = power_series[-1]
    current = (latest_kw * 1000.0) / (1.732 * vll * pf) if vll > 0 and pf > 0 else 0.0

    features = {
        "current": float(current),
        "VLL": float(vll),
        "VLN": float(vln),
        "frequency": float(freq),
        "power_factor": float(pf),
        "hour": float(hour),
        "day_of_week": float(dow),
        "is_weekend": float(is_weekend),
        "month": float(dt.month),
        **{k: float(v) for k, v in lag_candidates.items()},
    }

    sensor_row = {
        "timestamp": dt,
        "current": round(features["current"], 3),
        "VLL": round(features["VLL"], 3),
        "VLN": round(features["VLN"], 3),
        "frequency": round(features["frequency"], 3),
        "power_factor": round(features["power_factor"], 3),
    }

    return features, sensor_row


def _predict_with_ensemble(features: Dict[str, float], models: Dict[str, Any]) -> Dict[str, Any]:
    row = np.array([[features.get(f, 0.0) for f in FEATURES]], dtype=float)
    row = np.nan_to_num(row, nan=0.0)

    preds: Dict[str, float] = {}

    if "xgb" in models:
        preds["xgb"] = float(models["xgb"].predict(row)[0])
    if "lgb" in models:
        preds["lgb"] = float(models["lgb"].predict(row)[0])
    if "rf" in models:
        preds["rf"] = float(models["rf"].predict(row)[0])

    if not preds:
        raise RuntimeError("No model predictions available")

    ensemble_kw = float(np.mean(list(preds.values())))
    spread = max(preds.values()) - min(preds.values()) if len(preds) > 1 else 0.0

    return {
        "ensemble_kw": max(ensemble_kw, 0.0),
        "preds": {k: round(v, 4) for k, v in preds.items()},
        "spread": round(spread, 4),
    }


def _efficiency_score(mean_kw_per_device: float, baseline_kw: float) -> float:
    if mean_kw_per_device <= 0:
        return 100.0
    raw = (baseline_kw / mean_kw_per_device) * 100.0
    return min(100.0, round(raw, 1))


def _chart_to_image(fig, width=460, height=220):
    fig_buf = BytesIO()
    fig.savefig(fig_buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    fig_buf.seek(0)
    return Image(fig_buf, width=width, height=height)


def _build_aggregate_features(building: Building) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """
    AGGREGATE ONLY: Builds features for building-level prediction.
    Does NOT use per-device data.
    """
    # Aggregate building-level metrics
    room_count = Room.objects.filter(building=building).count()
    
    # Try to get metadata if it exists, otherwise use defaults
    metadata = getattr(building, "metadata", {}) or {}
    area_sqft = _safe_float(metadata.get("area_sqft"), 0.0) if isinstance(metadata, dict) else 0.0
    occupancy = _safe_float(metadata.get("occupancy"), 0.0) if isinstance(metadata, dict) else 10.0
    
    if area_sqft <= 0:
        area_sqft = room_count * 500.0  # Default: 500 sqft per room
    if occupancy <= 0:
        occupancy = room_count * 5.0  # Default: 5 people per room
    
    # Historical building-level aggregates (if available from UsageLog)
    usage_qs = list(UsageLog.objects.filter(device__building=building).order_by("-date")[:12])
    power_series = []
    
    for u in reversed(usage_qs):
        hours = _safe_float(u.hours_used, 1.0)
        energy = _safe_float(u.energy_kwh, 0.0)
        if hours > 0:
            power_kw = energy / hours
        else:
            power_kw = 0.0
        power_series.append(max(power_kw, 0.0))
    
    # Fallback if no data
    if not power_series:
        power_series = [1.0] * 10
    
    while len(power_series) < 10:
        power_series.insert(0, power_series[0] if power_series else 1.0)
    
    # Lag features
    lag_candidates = {
        "power_lag_1": power_series[-1],
        "power_lag_5": power_series[-5] if len(power_series) >= 5 else np.nan,
        "power_lag_10": power_series[-10] if len(power_series) >= 10 else np.nan,
        "rolling_mean_5": float(np.mean(power_series[-5:])),
        "rolling_std_5": float(np.std(power_series[-5:])),
    }
    
    median_power = float(median(power_series)) if power_series else 1.0
    for key, value in list(lag_candidates.items()):
        if value is None or (isinstance(value, float) and np.isnan(value)):
            lag_candidates[key] = median_power
    
    # Time features
    now = timezone.now()
    hour = now.hour
    dow = now.weekday()
    is_weekend = 1 if dow >= 5 else 0
    
    # Electrical parameters (aggregated assumptions)
    pf = 0.9
    vll = 415.0
    vln = 240.0
    freq = 50.0
    
    latest_kw = power_series[-1]
    current = (latest_kw * 1000.0) / (1.732 * vll * pf) if vll > 0 and pf > 0 else 0.0
    
    features = {
        "current": float(current),
        "VLL": float(vll),
        "VLN": float(vln),
        "frequency": float(freq),
        "power_factor": float(pf),
        "hour": float(hour),
        "day_of_week": float(dow),
        "is_weekend": float(is_weekend),
        "month": float(now.month),
        **{k: float(v) for k, v in lag_candidates.items()},
    }
    
    sensor_row = {
        "timestamp": now,
        "building": building.name,
        "rooms": room_count,
        "area_sqft": round(area_sqft, 2),
        "occupancy": round(occupancy, 0),
        "current": round(features["current"], 3),
        "VLL": round(features["VLL"], 3),
        "VLN": round(features["VLN"], 3),
        "frequency": round(features["frequency"], 3),
        "power_factor": round(features["power_factor"], 3),
    }
    
    return features, sensor_row


def _predict_aggregates(building: Building, models: Dict[str, Any]) -> Dict[str, Any]:
    """
    AGGREGATE ONLY: Predicts TOTAL load and LIGHT+APPLIANCE load for a building.
    Returns: {total_kw, light_appliance_kw, heavy_load_kw, ...}
    """
    features, sensor_row = _build_aggregate_features(building)
    row = np.array([[features.get(f, 0.0) for f in FEATURES]], dtype=float)
    row = np.nan_to_num(row, nan=0.0)
    
    # Predict total power load
    total_preds: Dict[str, float] = {}
    if "xgb" in models["power"]:
        total_preds["xgb"] = float(models["power"]["xgb"].predict(row)[0])
    if "lgb" in models["power"]:
        total_preds["lgb"] = float(models["power"]["lgb"].predict(row)[0])
    if "rf" in models["power"]:
        total_preds["rf"] = float(models["power"]["rf"].predict(row)[0])
    
    if not total_preds:
        raise RuntimeError("No model predictions available for power")
    
    total_kw = max(float(np.mean(list(total_preds.values()))), 0.0)
    total_spread = max(total_preds.values()) - min(total_preds.values()) if len(total_preds) > 1 else 0.0
    
    # Predict light + appliance load
    light_preds: Dict[str, float] = {}
    if "xgb" in models["light"]:
        light_preds["xgb"] = float(models["light"]["xgb"].predict(row)[0])
    if "lgb" in models["light"]:
        light_preds["lgb"] = float(models["light"]["lgb"].predict(row)[0])
    if "rf" in models["light"]:
        light_preds["rf"] = float(models["light"]["rf"].predict(row)[0])
    
    if not light_preds:
        raise RuntimeError("No model predictions available for light")
    
    light_appliance_kw = max(float(np.mean(list(light_preds.values()))), 0.0)
    light_spread = max(light_preds.values()) - min(light_preds.values()) if len(light_preds) > 1 else 0.0
    
    # Derived heavy load
    heavy_load_kw = max(total_kw - light_appliance_kw, 0.0)
    
    # Load ratios
    light_ratio = (light_appliance_kw / total_kw) if total_kw > 0 else 0.0
    heavy_ratio = (heavy_load_kw / total_kw) if total_kw > 0 else 0.0
    
    return {
        "total_kw": round(total_kw, 4),
        "light_appliance_kw": round(light_appliance_kw, 4),
        "heavy_load_kw": round(heavy_load_kw, 4),
        "light_ratio": round(light_ratio, 4),
        "heavy_ratio": round(heavy_ratio, 4),
        "sensor": sensor_row,
        "total_ensemble_spread": round(total_spread, 4),
        "light_ensemble_spread": round(light_spread, 4),
    }


def generate_esg_report(user) -> BytesIO:
    """
    AGGREGATE ONLY: Queries buildings and runs BUILDING-LEVEL ML predictions.
    NO per-device predictions.
    Returns complete ESG PDF as BytesIO.
    """
    co2_factor = float(getattr(settings, "ESG_CO2_FACTOR", 0.82))
    cost_per_kwh = float(getattr(settings, "ESG_COST_PER_KWH", 8.0))
    hours_per_month = int(getattr(settings, "ESG_HOURS_PER_MONTH", 720))
    baseline_kw = float(getattr(settings, "ESG_EFFICIENCY_BASELINE_KW", 5.0))
    peak_threshold_kw = float(getattr(settings, "ESG_PEAK_THRESHOLD_KW", 15.0))

    buildings = _get_accessible_buildings(user)

    power_models = _load_models("power")
    light_models = _load_models("light")

    building_rows: List[Dict[str, Any]] = []
    anomalies: List[str] = []
    total_org_kw = 0.0
    total_org_light_appliance_kw = 0.0
    total_org_heavy_kw = 0.0

    for building in buildings:
        try:
            pred = _predict_aggregates(
                building,
                {"power": power_models, "light": light_models}
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to predict aggregates for building {building.name}: {str(e)}")
            continue

        total_kw = pred["total_kw"]
        light_appliance_kw = pred["light_appliance_kw"]
        heavy_load_kw = pred["heavy_load_kw"]
        light_ratio = pred["light_ratio"]
        heavy_ratio = pred["heavy_ratio"]
        sensor = pred["sensor"]
        
        # Monthly projections
        monthly_kwh_total = total_kw * hours_per_month
        monthly_kwh_light = light_appliance_kw * hours_per_month
        monthly_kwh_heavy = heavy_load_kw * hours_per_month
        
        monthly_co2 = monthly_kwh_total * co2_factor
        monthly_co2_light = monthly_kwh_light * co2_factor
        monthly_co2_heavy = monthly_kwh_heavy * co2_factor
        
        monthly_cost = monthly_kwh_total * cost_per_kwh
        
        # Efficiency score: (expected_baseline / actual_total) * 100
        efficiency_score = (baseline_kw / total_kw * 100.0) if total_kw > 0 else 100.0
        efficiency_score = min(100.0, max(0.0, efficiency_score))
        
        # Anomaly detection at building level
        if total_kw > peak_threshold_kw:
            anomalies.append(f"High Load Zone: {building.name} predicts {total_kw:.2f} kW (above {peak_threshold_kw} kW threshold)")
        
        if light_ratio > 0.7:
            anomalies.append(f"Excessive Lighting: {building.name} has {light_ratio*100:.1f}% lighting + appliance load — check idle lights")
        
        if heavy_ratio > 0.8:
            anomalies.append(f"Heavy Machinery Overload: {building.name} has {heavy_ratio*100:.1f}% heavy load — inspect HVAC or motors")
        
        # Load intensity metrics (if area available)
        area_sqft = sensor["area_sqft"]
        kw_per_area = (total_kw / area_sqft) if area_sqft > 0 else 0.0
        occupancy = sensor["occupancy"]
        kw_per_occupant = (total_kw / occupancy) if occupancy > 0 else 0.0
        
        row = {
            "name": building.name,
            "rooms": sensor["rooms"],
            "area_sqft": area_sqft,
            "occupancy": int(occupancy),
            "total_kw": total_kw,
            "light_appliance_kw": light_appliance_kw,
            "heavy_load_kw": heavy_load_kw,
            "light_ratio_pct": round(light_ratio * 100, 1),
            "heavy_ratio_pct": round(heavy_ratio * 100, 1),
            "kw_per_area": round(kw_per_area, 4),
            "kw_per_occupant": round(kw_per_occupant, 4),
            "monthly_kwh_total": round(monthly_kwh_total, 2),
            "monthly_kwh_light": round(monthly_kwh_light, 2),
            "monthly_kwh_heavy": round(monthly_kwh_heavy, 2),
            "monthly_co2": round(monthly_co2, 2),
            "monthly_co2_light": round(monthly_co2_light, 2),
            "monthly_co2_heavy": round(monthly_co2_heavy, 2),
            "monthly_cost": round(monthly_cost, 2),
            "efficiency_score": round(efficiency_score, 1),
            "sensor": sensor,
            "ensemble_confidence": round(1.0 - (pred["total_ensemble_spread"] / max(total_kw, 0.1)) if total_kw > 0 else 1.0, 3),
        }
        
        building_rows.append(row)
        total_org_kw += total_kw
        total_org_light_appliance_kw += light_appliance_kw
        total_org_heavy_kw += heavy_load_kw

    building_rows.sort(key=lambda x: x["total_kw"], reverse=True)
    
    # Organization-level metrics
    org_monthly_kwh = total_org_kw * hours_per_month
    org_monthly_co2 = org_monthly_kwh * co2_factor
    org_monthly_cost = org_monthly_kwh * cost_per_kwh
    org_light_appliance_monthly_kwh = total_org_light_appliance_kw * hours_per_month
    org_heavy_monthly_kwh = total_org_heavy_kw * hours_per_month
    org_light_appliance_monthly_co2 = org_light_appliance_monthly_kwh * co2_factor
    org_heavy_monthly_co2 = org_heavy_monthly_kwh * co2_factor
    
    org_efficiency = (baseline_kw / total_org_kw * 100.0) if total_org_kw > 0 else 100.0
    org_efficiency = min(100.0, max(0.0, org_efficiency))
    
    org_light_ratio = (total_org_light_appliance_kw / total_org_kw) if total_org_kw > 0 else 0.0
    org_heavy_ratio = (total_org_heavy_kw / total_org_kw) if total_org_kw > 0 else 0.0
    
    best_building = min(building_rows, key=lambda x: x["total_kw"])["name"] if building_rows else "N/A"
    worst_building = building_rows[0]["name"] if building_rows else "N/A"

    styles = getSampleStyleSheet()
    brand = colors.HexColor("#0C4B33")
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=22, textColor=brand, alignment=1, spaceAfter=8)
    subtitle_style = ParagraphStyle("subtitle", parent=styles["Normal"], fontSize=12, textColor=colors.grey, alignment=1)
    section_style = ParagraphStyle("section", parent=styles["Heading2"], fontSize=16, textColor=brand, spaceAfter=12)
    normal = styles["Normal"]

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=50,
        bottomMargin=40,
        leftMargin=50,
        rightMargin=50,
    )
    story: List[Any] = []

    # Page 1: Cover
    stamp = timezone.localtime().strftime("%d %b %Y, %H:%M IST")
    story.append(Paragraph("ESG Energy Report - Arka Energy Nexus", title_style))
    story.append(Paragraph("Aggregate Building-Level Analysis", subtitle_style))
    story.append(Spacer(1, 16))
    story.append(Paragraph(f"Date: {stamp}", normal))
    story.append(Paragraph(f"Organisation: {_org_name(user)}", normal))
    story.append(Spacer(1, 24))
    story.append(Table([[" " * 140]], colWidths=[495], rowHeights=[18], style=[("BACKGROUND", (0, 0), (-1, -1), brand)]))
    story.append(PageBreak())

    # Page 2: Executive Summary
    story.append(Paragraph("Executive Summary", section_style))
    summary_data = [
        ["Metric", "Value"],
        ["Total Buildings Analysed", str(len(buildings))],
        ["Total Predicted Power (kW)", f"{total_org_kw:.3f}"],
        ["  - Lighting + Appliances", f"{total_org_light_appliance_kw:.3f} kW ({org_light_ratio*100:.1f}%)"],
        ["  - Heavy Load (HVAC, Motors, etc.)", f"{total_org_heavy_kw:.3f} kW ({org_heavy_ratio*100:.1f}%)"],
        ["Projected Monthly Energy (kWh)", f"{org_monthly_kwh:.2f}"],
        ["Projected Monthly CO2 (kg)", f"{org_monthly_co2:.2f}"],
        ["Projected Monthly Cost (INR)", f"{org_monthly_cost:.2f}"],
        ["Building-Level Efficiency Score (0-100)", f"{org_efficiency:.1f}"],
        ["Most Efficient Building", best_building],
        ["Highest-Consumption Building", worst_building],
        ["Critical Anomalies Detected", str(len(anomalies))],
    ]
    sum_tbl = Table(summary_data, colWidths=[290, 195])
    sum_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    story.append(sum_tbl)
    story.append(PageBreak())

    # Page 3: Building-Level Summary Table
    story.append(Paragraph("Building Load Analysis", section_style))
    b_data = [["Building", "Rooms", "Total kW", "Light %", "Heavy %", "Monthly CO2", "Eff. Score"]]
    for b in building_rows:
        b_data.append([
            b["name"], str(b["rooms"]),
            f"{b['total_kw']:.2f}", f"{b['light_ratio_pct']:.1f}%", f"{b['heavy_ratio_pct']:.1f}%",
            f"{b['monthly_co2']:.1f} kg", f"{b['efficiency_score']:.1f}",
        ])
    b_tbl = Table(b_data, colWidths=[110, 50, 65, 65, 65, 90, 70])
    b_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ])
    for i in range(1, len(b_data)):
        if i % 2 == 0:
            b_style.add("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f4f7f5"))
    b_tbl.setStyle(b_style)
    story.append(b_tbl)
    story.append(PageBreak())

    # Page 4: Load Composition Pie Chart
    story.append(Paragraph("Organization Load Composition", section_style))
    
    # Only render pie chart if we have valid aggregate data
    if total_org_kw > 0 and (total_org_light_appliance_kw > 0 or total_org_heavy_kw > 0):
        fig_pie, ax_pie = plt.subplots(figsize=(6, 4))
        sizes = [total_org_light_appliance_kw, total_org_heavy_kw]
        labels = [f"Lighting + Appliances\n{org_light_ratio*100:.1f}%", f"Heavy Load (HVAC, Motors)\n{org_heavy_ratio*100:.1f}%"]
        colors_pie = ["#29d4a0", "#4e9af1"]
        ax_pie.pie(sizes, labels=labels, colors=colors_pie, autopct="%1.1f kW", startangle=90)
        ax_pie.set_title("Load Segmentation Analysis")
        story.append(_chart_to_image(fig_pie, width=400, height=280))
    else:
        story.append(Paragraph(
            f"<i>Insufficient data for load composition analysis. No valid building predictions available. "
            f"Ensure ML models are loaded and buildings exist in the database.</i>",
            normal
        ))
    story.append(PageBreak())

    # Page 5: Building Total Power Chart
    story.append(Paragraph("Predicted Total Power by Building", section_style))
    if building_rows:
        fig1, ax1 = plt.subplots(figsize=(7.2, 3.2))
        names = [b["name"] for b in building_rows]
        kw_vals = [b["total_kw"] for b in building_rows]
        colors_by_eff = []
        for b in building_rows:
            if b["efficiency_score"] >= 80:
                colors_by_eff.append("#29d4a0")
            elif b["efficiency_score"] >= 50:
                colors_by_eff.append("#f1a94e")
            else:
                colors_by_eff.append("#e05c5c")
        ax1.barh(names, kw_vals, color=colors_by_eff)
        ax1.set_title("Building Total Predicted Power (kW)")
        ax1.set_xlabel("Total predicted kW")
        story.append(_chart_to_image(fig1, width=460, height=220))
    else:
        story.append(Paragraph(
            f"<i>No buildings with valid predictions to display. Ensure models are loaded and predictions succeed.</i>",
            normal
        ))
    story.append(PageBreak())

    # Page 6: Load Composition by Building (Stacked)
    story.append(Paragraph("Load Composition by Building (Light vs Heavy)", section_style))
    if building_rows:
        fig2, ax2 = plt.subplots(figsize=(7.2, 3.5))
        x = np.arange(len(building_rows))
        w = 0.6
        light_vals = [b["light_appliance_kw"] for b in building_rows]
        heavy_vals = [b["heavy_load_kw"] for b in building_rows]
        labels = [b["name"] for b in building_rows]
        ax2.bar(x, light_vals, width=w, color="#29d4a0", label="Lighting + Appliances")
        ax2.bar(x, heavy_vals, width=w, bottom=light_vals, color="#4e9af1", label="Heavy Load (HVAC, Motors)")
        ax2.set_xticks(x)
        ax2.set_xticklabels(labels, rotation=20, ha="right")
        ax2.set_ylabel("Power (kW)")
        ax2.set_title("Load Composition by Building")
        ax2.legend(fontsize=9)
        story.append(_chart_to_image(fig2, width=460, height=230))
    else:
        story.append(Paragraph(
            f"<i>No buildings with valid predictions to display load composition.</i>",
            normal
        ))
    story.append(PageBreak())

    # Page 7: Monthly CO2 Projection by Load Type
    story.append(Paragraph("Monthly CO2 Projection by Load Type", section_style))
    if building_rows:
        fig3, ax3 = plt.subplots(figsize=(7.2, 3.5))
        x = np.arange(len(building_rows))
        w = 0.6
        light_co2 = [b["monthly_co2_light"] for b in building_rows]
        heavy_co2 = [b["monthly_co2_heavy"] for b in building_rows]
        labels = [b["name"] for b in building_rows]
        ax3.bar(x, light_co2, width=w, color="#29d4a0", label="Lighting + Appliances CO2")
        ax3.bar(x, heavy_co2, width=w, bottom=light_co2, color="#4e9af1", label="Heavy Load CO2")
        ax3.set_xticks(x)
        ax3.set_xticklabels(labels, rotation=20, ha="right")
        ax3.set_ylabel("CO2 Emissions (kg/month)")
        ax3.set_title("Monthly CO2 Projection by Building")
        ax3.legend(fontsize=9)
        story.append(_chart_to_image(fig3, width=460, height=230))
    else:
        story.append(Paragraph(
            f"<i>No buildings with valid CO2 projections to display.</i>",
            normal
        ))
    story.append(PageBreak())

    # Page 8: Efficiency Gauge
    story.append(Paragraph("Building-Level Efficiency Scores", section_style))
    if building_rows:
        fig_eff, ax_eff = plt.subplots(figsize=(7.2, 3.2))
        eff_names = [b["name"] for b in building_rows]
        eff_scores = [b["efficiency_score"] for b in building_rows]
        eff_colors = ["#29d4a0" if s >= 80 else "#f1a94e" if s >= 50 else "#e05c5c" for s in eff_scores]
        ax_eff.barh(eff_names, eff_scores, color=eff_colors)
        ax_eff.axvline(x=80, color="green", linestyle="--", linewidth=1, label="Excellent (80+)")
        ax_eff.axvline(x=50, color="orange", linestyle="--", linewidth=1, label="Fair (50-80)")
        ax_eff.set_xlim(0, 100)
        ax_eff.set_title("Building-Level Efficiency Scores (0-100)")
        ax_eff.set_xlabel("Efficiency Score")
        ax_eff.legend(fontsize=8)
        story.append(_chart_to_image(fig_eff, width=460, height=220))
    else:
        story.append(Paragraph(
            f"<i>No building efficiency scores available. Run predictions to populate.</i>",
            normal
        ))
    story.append(PageBreak())

    # Page 9: Anomalies & Insights
    story.append(Paragraph("Anomalies & Energy Insights", section_style))
    
    if anomalies:
        story.append(Paragraph("<b>Critical Findings:</b>", normal))
        for anomaly in anomalies[:15]:
            story.append(Paragraph(f"• {anomaly}", normal))
        story.append(Spacer(1, 10))
    else:
        story.append(Paragraph("No critical anomalies detected. All buildings operating within normal parameters.", normal))
        story.append(Spacer(1, 10))
    
    # Recommendations
    story.append(Paragraph("<b>Recommendations:</b>", normal))
    rec_lines = []
    
    for b in building_rows:
        if b["light_ratio_pct"] > 50:
            rec_lines.append(f"• {b['name']}: Consider LED retrofits and occupancy sensors — lighting dominates {b['light_ratio_pct']:.0f}% of load")
        if b["efficiency_score"] < 50:
            rec_lines.append(f"• {b['name']}: Priority optimization — efficiency score {b['efficiency_score']:.0f} is below target. Review HVAC schedules.")
        if b["kw_per_area"] > 0.05:
            rec_lines.append(f"• {b['name']}: High load intensity ({b['kw_per_area']:.3f} kW/sqft) — audit electrical systems")
    
    if not rec_lines:
        rec_lines.append("• Maintain preventive maintenance schedules")
        rec_lines.append("• Continue trend monitoring quarterly")
    
    for line in rec_lines[:12]:
        story.append(Paragraph(line, normal))
    
    story.append(PageBreak())

    # Page 10: Building Load Intensity Metrics
    story.append(Paragraph("Building Load Intensity & Occupancy Analysis", section_style))
    intensity_data = [["Building", "Area (sqft)", "Occupancy", "kW/sqft", "kW/person", "Monthly kWh"]]
    for b in building_rows:
        intensity_data.append([
            b["name"],
            f"{b['area_sqft']:.0f}",
            str(b["occupancy"]),
            f"{b['kw_per_area']:.4f}",
            f"{b['kw_per_occupant']:.3f}",
            f"{b['monthly_kwh_total']:.1f}",
        ])
    intensity_tbl = Table(intensity_data, colWidths=[100, 90, 75, 75, 85, 100])
    intensity_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(intensity_tbl)
    story.append(PageBreak())

    # Page 11: Sensor Readings & Model Confidence
    story.append(Paragraph("Latest Building Sensor Readings & Model Confidence", section_style))
    sensor_data = [["Building", "Rooms", "Current (A)", "VLL (V)", "Power Factor", "Ensemble Confidence"]]
    for b in building_rows:
        s = b["sensor"]
        sensor_data.append([
            s["building"],
            str(s["rooms"]),
            f"{s['current']:.2f}",
            f"{s['VLL']:.1f}",
            f"{s['power_factor']:.2f}",
            f"{b['ensemble_confidence']*100:.1f}%",
        ])
    sensor_tbl = Table(sensor_data, colWidths=[100, 70, 85, 70, 90, 100])
    sensor_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(sensor_tbl)
    story.append(PageBreak())

    # Page 12: Methodology & Configuration
    story.append(Paragraph("Methodology & Configuration", section_style))
    
    story.append(Paragraph("<b>Prediction Approach (Aggregate):</b>", normal))
    story.append(Paragraph(
        "This report uses BUILDING-LEVEL predictions only. Each building receives one prediction from an ensemble of XGBoost, "
        "LightGBM, and Random Forest models. The ensemble produces two outputs:",
        normal
    ))
    story.append(Paragraph("• <b>Total Load (kW)</b>: Aggregate power consumption for entire building", normal))
    story.append(Paragraph("• <b>Lighting + Appliance Load (kW)</b>: Combined predictable load category", normal))
    story.append(Paragraph("• <b>Heavy Load (kW)</b>: Derived as Total - (Lighting + Appliance)", normal))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Features Used:</b>", normal))
    story.append(Paragraph(
        "Current, VLL, VLN, frequency, power_factor, hour, day_of_week, is_weekend, month, "
        "power_lag_1, power_lag_5, power_lag_10, rolling_mean_5, rolling_std_5",
        normal
    ))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"<b>Configuration Parameters:</b>", normal))
    story.append(Paragraph(f"CO2 factor: {co2_factor} kg CO2/kWh", normal))
    story.append(Paragraph(f"Cost factor: INR {cost_per_kwh}/kWh", normal))
    story.append(Paragraph(f"Monthly operational hours: {hours_per_month} hours", normal))
    story.append(Paragraph(f"Efficiency baseline: {baseline_kw} kW", normal))
    story.append(Paragraph(f"Peak load threshold: {peak_threshold_kw} kW", normal))
    
    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>Disclaimer:</b>", normal))
    story.append(Paragraph(
        "All predictions are ML-generated estimates based on historical patterns and current sensor readings. "
        "They are NOT metered readings and should be used for optimization guidance only. "
        "Actual consumption may vary based on occupancy, weather, and operational changes.",
        normal
    ))
    
    doc.build(story)
    buffer.seek(0)
    return buffer
