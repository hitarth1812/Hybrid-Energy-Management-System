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


def generate_esg_report(user) -> BytesIO:
    """
    Queries all accessible buildings for user, runs per-device ML predictions,
    and returns a complete ESG PDF as BytesIO.
    """
    co2_factor = float(getattr(settings, "ESG_CO2_FACTOR", 0.82))
    cost_per_kwh = float(getattr(settings, "ESG_COST_PER_KWH", 8.0))
    hours_per_month = int(getattr(settings, "ESG_HOURS_PER_MONTH", 720))
    baseline_kw = float(getattr(settings, "ESG_EFFICIENCY_BASELINE_KW", 5.0))

    buildings = _get_accessible_buildings(user)

    power_models = _load_models("power")
    light_models = _load_models("light")

    device_rows: List[Dict[str, Any]] = []
    building_stats: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
        "name": "",
        "rooms": set(),
        "devices": 0,
        "total_kw": 0.0,
        "power_co2": 0.0,
        "light_co2": 0.0,
    })

    total_rooms = 0

    for building in buildings:
        rooms = list(Room.objects.filter(building=building))
        total_rooms += len(rooms)

        for room in rooms:
            devices = Device.objects.filter(room=room, building=building).select_related("category")
            for device in devices:
                if not _is_device_active(device):
                    continue

                model_type = "light" if _is_light_device(device) else "power"
                model_bundle = light_models if model_type == "light" else power_models

                try:
                    power_rows = _extract_power_history(device)
                    features, sensor_row = _build_features(device, power_rows)
                    pred = _predict_with_ensemble(features, model_bundle)
                except Exception:
                    continue

                predicted_kw = pred["ensemble_kw"]
                monthly_kwh = predicted_kw * hours_per_month
                monthly_co2 = monthly_kwh * co2_factor
                monthly_cost = monthly_kwh * cost_per_kwh

                b = building_stats[building.id]
                b["name"] = building.name
                b["rooms"].add(room.id)
                b["devices"] += 1
                b["total_kw"] += predicted_kw
                if model_type == "light":
                    b["light_co2"] += monthly_co2
                else:
                    b["power_co2"] += monthly_co2

                device_rows.append({
                    "device": device.name or device.device_type,
                    "room": room.name,
                    "building": building.name,
                    "model_type": model_type,
                    "predicted_kw": predicted_kw,
                    "monthly_kwh": monthly_kwh,
                    "monthly_co2": monthly_co2,
                    "monthly_cost": monthly_cost,
                    "features": features,
                    "sensor": sensor_row,
                    "per_model": pred["preds"],
                })

    total_devices = len(device_rows)
    total_kw = sum(d["predicted_kw"] for d in device_rows)
    monthly_kwh = total_kw * hours_per_month
    monthly_co2 = monthly_kwh * co2_factor
    monthly_cost = monthly_kwh * cost_per_kwh
    mean_kw_device = (total_kw / total_devices) if total_devices else 0.0
    overall_eff = _efficiency_score(mean_kw_device, baseline_kw)

    building_rows: List[Dict[str, Any]] = []
    for b in building_stats.values():
        dev_count = b["devices"]
        mean_kw = b["total_kw"] / dev_count if dev_count else 0.0
        b_monthly_kwh = b["total_kw"] * hours_per_month
        b_monthly_co2 = b_monthly_kwh * co2_factor
        b_monthly_cost = b_monthly_kwh * cost_per_kwh
        building_rows.append({
            "name": b["name"],
            "rooms": len(b["rooms"]),
            "devices": dev_count,
            "total_kw": b["total_kw"],
            "monthly_kwh": b_monthly_kwh,
            "monthly_co2": b_monthly_co2,
            "monthly_cost": b_monthly_cost,
            "eff_score": _efficiency_score(mean_kw, baseline_kw),
            "power_co2": b["power_co2"],
            "light_co2": b["light_co2"],
        })

    building_rows.sort(key=lambda x: x["total_kw"], reverse=True)
    best_building = min(building_rows, key=lambda x: (x["total_kw"] / x["devices"]) if x["devices"] else 10**9)["name"] if building_rows else "N/A"
    highest_building = building_rows[0]["name"] if building_rows else "N/A"

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

    # Page 1 Cover
    stamp = timezone.localtime().strftime("%d %b %Y, %H:%M IST")
    story.append(Paragraph("ESG Energy Report - Arka Energy Nexus", title_style))
    story.append(Paragraph("Auto-generated · All Buildings · All Devices", subtitle_style))
    story.append(Spacer(1, 16))
    story.append(Paragraph(f"Date: {stamp}", normal))
    story.append(Paragraph(f"Organisation: {_org_name(user)}", normal))
    story.append(Spacer(1, 24))
    story.append(Table([[" " * 140]], colWidths=[495], rowHeights=[18], style=[("BACKGROUND", (0, 0), (-1, -1), brand)]))
    story.append(PageBreak())

    # Page 2 Executive summary
    story.append(Paragraph("Executive Summary", section_style))
    summary_data = [
        ["Metric", "Value"],
        ["Total Buildings Analysed", str(len(buildings))],
        ["Total Rooms Analysed", str(total_rooms)],
        ["Total Devices Analysed", str(total_devices)],
        ["Total Predicted Power (kW)", f"{total_kw:.3f}"],
        ["Projected Monthly Energy (kWh)", f"{monthly_kwh:.2f}"],
        ["Projected Monthly CO2 (kg)", f"{monthly_co2:.2f}"],
        ["Projected Monthly Cost (INR)", f"{monthly_cost:.2f}"],
        ["Overall Efficiency Score (0-100)", f"{overall_eff:.1f}"],
        ["Best-Performing Building", best_building],
        ["Highest-Consumption Building", highest_building],
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

    # Page 3 Building table
    story.append(Paragraph("Building-Level Summary", section_style))
    b_data = [["Building", "Rooms", "Devices", "Total kW", "Monthly kWh", "CO2 (kg)", "Cost (INR)", "Eff."]]
    for idx, b in enumerate(building_rows):
        b_data.append([
            b["name"], str(b["rooms"]), str(b["devices"]),
            f"{b['total_kw']:.2f}", f"{b['monthly_kwh']:.1f}",
            f"{b['monthly_co2']:.1f}", f"{b['monthly_cost']:.1f}",
            f"{b['eff_score']:.1f}",
        ])
    b_tbl = Table(b_data, colWidths=[110, 40, 45, 55, 65, 65, 65, 50])
    b_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ])
    for i in range(1, len(b_data)):
        if i % 2 == 0:
            b_style.add("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f4f7f5"))
    b_tbl.setStyle(b_style)
    story.append(b_tbl)
    story.append(PageBreak())

    # Page 4 Predicted power chart
    story.append(Paragraph("Predicted Power by Building", section_style))
    fig1, ax1 = plt.subplots(figsize=(7.2, 3.2))
    names = [b["name"] for b in building_rows] or ["N/A"]
    kw_vals = [b["total_kw"] for b in building_rows] or [0.0]
    colors_by_eff = []
    for b in building_rows:
        if b["eff_score"] >= 80:
            colors_by_eff.append("#29d4a0")
        elif b["eff_score"] >= 50:
            colors_by_eff.append("#f1a94e")
        else:
            colors_by_eff.append("#e05c5c")
    if not colors_by_eff:
        colors_by_eff = ["#29d4a0"]
    ax1.barh(names, kw_vals, color=colors_by_eff)
    ax1.set_title("Predicted Power by Building")
    ax1.set_xlabel("Total predicted kW")
    story.append(_chart_to_image(fig1, width=460, height=220))
    story.append(PageBreak())

    # Page 5 CO2 grouped chart
    story.append(Paragraph("Monthly CO2 Projection by Building (kg)", section_style))
    fig2, ax2 = plt.subplots(figsize=(7.2, 3.2))
    x = np.arange(len(building_rows))
    w = 0.35
    power_vals = [b["power_co2"] for b in building_rows]
    light_vals = [b["light_co2"] for b in building_rows]
    if len(building_rows) == 0:
        x = np.arange(1)
        power_vals = [0.0]
        light_vals = [0.0]
        labels = ["N/A"]
    else:
        labels = [b["name"] for b in building_rows]
    ax2.bar(x - w / 2, power_vals, width=w, color="#4e9af1", label="Power devices CO2")
    ax2.bar(x + w / 2, light_vals, width=w, color="#29d4a0", label="Light devices CO2")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels, rotation=20, ha="right")
    ax2.set_title("Monthly CO2 Projection by Building (kg)")
    ax2.legend(fontsize=8)
    story.append(_chart_to_image(fig2, width=460, height=220))
    story.append(PageBreak())

    # Page 6 top 10
    story.append(Paragraph("Top 10 Highest-Consumption Devices", section_style))
    top10 = sorted(device_rows, key=lambda d: d["predicted_kw"], reverse=True)[:10]
    t6 = [["Device", "Room", "Building", "Model", "Pred kW", "Monthly kWh", "Monthly CO2"]]
    for d in top10:
        t6.append([
            d["device"][:20], d["room"][:16], d["building"][:16], d["model_type"],
            f"{d['predicted_kw']:.3f}", f"{d['monthly_kwh']:.1f}", f"{d['monthly_co2']:.1f}",
        ])
    tbl6 = Table(t6, colWidths=[95, 65, 70, 45, 55, 80, 85])
    tbl6.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(tbl6)
    story.append(PageBreak())

    # Page 7 bottom 10
    story.append(Paragraph("Top 10 Most Efficient Devices", section_style))
    bottom10 = sorted(device_rows, key=lambda d: d["predicted_kw"])[:10]
    t7 = [["Device", "Room", "Building", "Model", "Pred kW", "Monthly kWh", "Monthly CO2", "Eff. vs Base"]]
    for d in bottom10:
        efficiency_delta = ((baseline_kw - d["predicted_kw"]) / baseline_kw) * 100 if baseline_kw else 0.0
        t7.append([
            d["device"][:16], d["room"][:12], d["building"][:12], d["model_type"],
            f"{d['predicted_kw']:.3f}", f"{d['monthly_kwh']:.1f}", f"{d['monthly_co2']:.1f}", f"{efficiency_delta:.1f}%",
        ])
    tbl7 = Table(t7, colWidths=[80, 55, 60, 40, 48, 70, 70, 72])
    tbl7.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(tbl7)
    story.append(PageBreak())

    # Page 8 sensor readings
    story.append(Paragraph("Latest Sensor Readings Used for Prediction", section_style))
    t8 = [["Device", "current (A)", "VLL (V)", "VLN (V)", "frequency (Hz)", "power_factor", "Timestamp"]]
    for d in device_rows[:20]:
        s = d["sensor"]
        t8.append([
            d["device"][:20], f"{s['current']:.2f}", f"{s['VLL']:.1f}", f"{s['VLN']:.1f}",
            f"{s['frequency']:.2f}", f"{s['power_factor']:.2f}", s["timestamp"].strftime("%Y-%m-%d %H:%M"),
        ])
    tbl8 = Table(t8, colWidths=[100, 65, 60, 60, 75, 55, 80])
    tbl8.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(tbl8)
    if len(device_rows) > 20:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"Showing first 20 rows out of {len(device_rows)} devices.", normal))
    story.append(PageBreak())

    # Page 9 confidence summary
    story.append(Paragraph("Model Prediction Confidence", section_style))
    metrics_cfg = getattr(settings, "ESG_MODEL_METRICS", {})
    power_metrics = metrics_cfg.get("power", {}) if isinstance(metrics_cfg, dict) else {}
    light_metrics = metrics_cfg.get("light", {}) if isinstance(metrics_cfg, dict) else {}

    def _metric_row(name: str, data: Dict[str, Any]):
        if not data:
            return [name, "N/A - run notebook to populate", "N/A - run notebook to populate", "N/A - run notebook to populate"]
        return [
            name,
            f"{_safe_float(data.get('mae'), 0.0):.4f}",
            f"{_safe_float(data.get('rmse'), 0.0):.4f}",
            f"{_safe_float(data.get('r2'), 0.0):.4f}",
        ]

    t9 = [["Model", "MAE", "RMSE", "R<super>2</super>"], _metric_row("Power", power_metrics), _metric_row("Light", light_metrics)]
    t9_tbl = Table(t9, colWidths=[110, 125, 125, 125])
    t9_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
    ]))
    story.append(t9_tbl)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Predictions use an equal-weight ensemble of XGBoost, LightGBM, and Random Forest. "
        "Features are re-engineered per device using the last 10 readings to avoid boundary leakage.",
        normal,
    ))
    story.append(PageBreak())

    # Page 10 recommendations
    story.append(Paragraph("Recommendations & Methodology", section_style))
    rec_lines: List[str] = []

    for b in building_rows:
        if b["eff_score"] < 50:
            rec_lines.append(f"High Priority: {b['name']} has efficiency score {b['eff_score']:.1f}. Optimize schedules and inspect high-load circuits.")

    by_building_avg = {}
    for b in building_rows:
        by_building_avg[b["name"]] = (b["total_kw"] / b["devices"]) if b["devices"] else 0.0

    for d in device_rows:
        avg = by_building_avg.get(d["building"], 0.0)
        if avg > 0 and d["predicted_kw"] > 3 * avg:
            rec_lines.append(
                f"Anomaly: {d['device']} in {d['building']} predicts {d['predicted_kw']:.2f} kW, above 3x building average ({avg:.2f} kW)."
            )

    if not rec_lines:
        rec_lines.append("No critical anomalies found. Maintain preventive checks and continue trend monitoring.")

    for line in rec_lines[:12]:
        story.append(Paragraph(f"- {line}", normal))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Methodology: Device-level predictions use per-device lag and rolling features from recent readings, then aggregate to room/building/organization.", normal))
    story.append(Paragraph(f"CO2 factor source: configured ESG_CO2_FACTOR = {co2_factor} kg CO2/kWh.", normal))
    story.append(Paragraph(f"Cost factor source: configured ESG_COST_PER_KWH = INR {cost_per_kwh}/kWh.", normal))
    story.append(Paragraph("Disclaimer: Predictions are ML-generated estimates, not metered readings.", normal))

    doc.build(story)
    buffer.seek(0)
    return buffer
