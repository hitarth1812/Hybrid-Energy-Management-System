from __future__ import annotations

import os
from datetime import datetime, timedelta
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

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
from reportlab.platypus.flowables import HRFlowable

from .models import PredictionLog

matplotlib.use("Agg")
import matplotlib.pyplot as plt

FEATURES = [
    "current", "VLL", "VLN", "frequency", "power_factor",
    "hour", "day_of_week", "is_weekend", "month",
    "power_lag_1", "power_lag_5", "power_lag_10",
    "rolling_mean_5", "rolling_std_5",
]

XGB_POWER = "xgb_power.json"
LGB_POWER = "lgb_power.txt"
RF_POWER = "rf_power.joblib"
XGB_LIGHT = "xgb_light.json"
LGB_LIGHT = "lgb_light.txt"
RF_LIGHT = "rf_light.joblib"

COLOR_XGB = "#2ECC9A"
COLOR_LGB = "#E74C3C"
COLOR_RF = "#3498DB"
COLOR_ENSEMBLE = "#F39C12"

def _safe_float(value: Any, default: float) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def _org_name(user) -> str:
    return "ARKA ENERGY NEXUS"

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
        return {"ensemble_kw": 0.0, "preds": {}, "spread": 0.0}

    ensemble_kw = float(np.mean(list(preds.values())))
    spread = max(preds.values()) - min(preds.values()) if len(preds) > 1 else 0.0

    return {
        "ensemble_kw": max(ensemble_kw, 0.0),
        "preds": {k: round(v, 4) for k, v in preds.items()},
        "spread": round(spread, 4),
    }

def _chart_to_image(fig, width=500, height=190):
    fig_buf = BytesIO()
    fig.savefig(fig_buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    fig_buf.seek(0)
    return Image(fig_buf, width=width, height=height)

def _normalize_range(date_from: Optional[datetime], date_to: Optional[datetime]) -> Tuple[datetime, datetime]:
    now = timezone.localtime()
    end_dt = date_to or now
    start_dt = date_from or (end_dt - timedelta(days=29))

    if timezone.is_naive(start_dt):
        start_dt = timezone.make_aware(start_dt)
    if timezone.is_naive(end_dt):
        end_dt = timezone.make_aware(end_dt)

    end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=0)
    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    if start_dt > end_dt:
        start_dt, end_dt = end_dt, start_dt
    return start_dt, end_dt

def _get_alternating_table_style(num_rows: int) -> TableStyle:
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A5276")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ])
    for i in range(1, num_rows):
        bg = colors.HexColor("#F8F8F8") if i % 2 == 1 else colors.white
        style.add("BACKGROUND", (0, i), (-1, i), bg)
    return style

def generate_esg_report(
    user,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    granularity: str = "month",
) -> BytesIO:
    granularity = (granularity or "month").lower()
    co2_factor = float(getattr(settings, "ESG_CO2_FACTOR", 0.82))
    cost_per_kwh = float(getattr(settings, "ESG_COST_PER_KWH", 8.0))

    start_dt, end_dt = _normalize_range(date_from, date_to)

    logs = list(
        PredictionLog.objects.filter(timestamp__gte=start_dt, timestamp__lte=end_dt)
        .order_by("timestamp")
    )

    models_loaded = _load_models("power")

    styles = getSampleStyleSheet()
    brand_color = colors.HexColor("#1A5276")
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=22, textColor=brand_color, alignment=1, spaceAfter=8)
    subtitle_style = ParagraphStyle("subtitle", parent=styles["Normal"], fontSize=12, textColor=colors.grey, alignment=1)
    section_style = ParagraphStyle("section", parent=styles["Heading2"], fontSize=16, textColor=brand_color, spaceAfter=12)
    caption_style = ParagraphStyle("caption", parent=styles["Normal"], fontSize=10, textColor=colors.grey, fontName="Helvetica-Oblique", alignment=1, spaceAfter=12)
    normal = styles["Normal"]

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=40, bottomMargin=40, leftMargin=40, rightMargin=40)
    story: List[Any] = []

    # Header Bar
    story.append(Table([["ARKA ENERGY NEXUS", "ESG Energy Report"]], colWidths=[250, 265], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), brand_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])))
    story.append(Spacer(1, 15))

    date_label = f"{start_dt.date().isoformat()} to {end_dt.date().isoformat()}"
    stamp = timezone.localtime().strftime("%d %b %Y, %H:%M IST")

    story.append(Paragraph(f"Generated: {stamp}", normal))
    story.append(Paragraph(f"Date Range: {date_label}", normal))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2ECC9A'), spaceAfter=15))

    if not logs:
        story.append(Paragraph("No predictions in range.", section_style))
        doc.build(story)
        buffer.seek(0)
        return buffer

    rows: List[Dict[str, Any]] = []
    sensor_anomalies = []
    
    total_hours_in_range = (end_dt - start_dt).total_seconds() / 3600.0
    total_predictions = len(logs)
    hours_per_interval = total_hours_in_range / total_predictions if total_predictions > 0 else 0

    for log in logs:
        snapshot = log.features_snapshot if isinstance(log.features_snapshot, dict) else {}
        
        features = {
            "current": _safe_float(snapshot.get("current"), 0.0),
            "VLL": _safe_float(snapshot.get("VLL"), 0.0),
            "VLN": _safe_float(snapshot.get("VLN"), 0.0),
            "frequency": _safe_float(snapshot.get("frequency"), 0.0),
            "power_factor": _safe_float(snapshot.get("power_factor"), 0.0),
            "hour": _safe_float(snapshot.get("hour"), 0.0),
            "day_of_week": _safe_float(snapshot.get("day_of_week"), 0.0),
            "is_weekend": _safe_float(snapshot.get("is_weekend"), 0.0),
            "month": _safe_float(snapshot.get("month"), 0.0),
            "power_lag_1": _safe_float(snapshot.get("power_lag_1"), 0.0),
            "power_lag_5": _safe_float(snapshot.get("power_lag_5"), 0.0),
            "power_lag_10": _safe_float(snapshot.get("power_lag_10"), 0.0),
            "rolling_mean_5": _safe_float(snapshot.get("rolling_mean_5"), 0.0),
            "rolling_std_5": _safe_float(snapshot.get("rolling_std_5"), 0.0),
        }

        pf = features["power_factor"]
        curr = features["current"]
        vll = features["VLL"]
        
        status = "OK"
        if pf > 1.0 or pf < 0.1 or curr > 200 or vll < 300:
            status = "ANOMALY"
            sensor_anomalies.append({
                "timestamp": log.timestamp,
                "current": curr,
                "vll": vll,
                "pf": pf,
            })

        pred_res = _predict_with_ensemble(features, models_loaded)
        
        rows.append({
            "timestamp": log.timestamp,
            "xgb": pred_res["preds"].get("xgb", 0.0),
            "lgb": pred_res["preds"].get("lgb", 0.0),
            "rf": pred_res["preds"].get("rf", 0.0),
            "ensemble": pred_res["ensemble_kw"],
            "current": curr,
            "VLL": vll,
            "power_factor": pf,
            "frequency": features["frequency"],
            "status": status,
        })

    total_projected_kwh = sum(r["ensemble"] * hours_per_interval for r in rows)
    total_co2 = total_projected_kwh * co2_factor
    total_cost = total_projected_kwh * cost_per_kwh
    mean_kw = float(np.mean([r["ensemble"] for r in rows]))
    
    story.append(Paragraph("Executive Summary", section_style))
    summary_data = [
        ["Total Predictions", str(total_predictions), "Mean kW", f"{mean_kw:.2f}"],
        ["Total kWh", f"{total_projected_kwh:.2f}", "Total CO2 (kg)", f"{total_co2:.2f}"],
        ["Estimated Cost", f"INR {total_cost:.2f}", "Anomalies", str(len(sensor_anomalies))],
    ]
    summary_tbl = Table(summary_data, colWidths=[120, 137, 120, 138])
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8F8F8")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#333333")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_tbl)
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2ECC9A'), spaceAfter=15))

    if total_predictions < 10:
        story.append(Paragraph("Prediction Trends & Analysis", section_style))
        story.append(Paragraph(f"<b>Insufficient data for trend chart ({total_predictions} predictions).</b>", normal))
        story.append(Spacer(1, 15))
    else:
        # A) Model Comparison: Grouped Bar
        story.append(Paragraph("Model Performance Comparison", section_style))
        figA, axA = plt.subplots(figsize=(8, 4))
        models_str = ["XGBoost", "LightGBM", "RandomForest", "Ensemble"]
        means = [
            np.mean([r["xgb"] for r in rows]),
            np.mean([r["lgb"] for r in rows]),
            np.mean([r["rf"] for r in rows]),
            np.mean([r["ensemble"] for r in rows]),
        ]
        axA.bar(models_str, means, color=[COLOR_XGB, COLOR_LGB, COLOR_RF, COLOR_ENSEMBLE])
        axA.set_ylabel("Mean kW")
        story.append(_chart_to_image(figA))
        story.append(Paragraph("Fig 1: Mean power output (kW) predicted by each constituent model vs Ensemble.", caption_style))

        # B) Prediction Timeline: scatter+line
        figB, axB = plt.subplots(figsize=(8, 4))
        times = [r["timestamp"] for r in rows]
        ensembles = [r["ensemble"] for r in rows]
        axB.plot(times, ensembles, marker='o', markersize=6, linewidth=2, color=COLOR_ENSEMBLE)
        axB.set_ylabel("Ensemble kW")
        figB.autofmt_xdate()
        story.append(_chart_to_image(figB))
        story.append(Paragraph("Fig 2: Timeline of Ensemble power predictions showing load variance.", caption_style))

        # C) Hour-of-day heatmap: 24x1
        story.append(PageBreak())
        story.append(Paragraph("Hourly Heatmap", section_style))
        figC, axC = plt.subplots(figsize=(8, 2))
        hour_means = np.zeros(24)
        hour_counts = np.zeros(24)
        for r in rows:
            h = timezone.localtime(r["timestamp"]).hour
            hour_means[h] += r["ensemble"]
            hour_counts[h] += 1
        for i in range(24):
            if hour_counts[i] > 0:
                hour_means[i] /= hour_counts[i]
        
        im = axC.imshow(hour_means.reshape(1, 24), cmap='YlOrRd', aspect='auto')
        axC.set_xticks(np.arange(24))
        axC.set_yticks([])
        axC.set_xlabel("Hour of Day (0-23)")
        plt.colorbar(im, ax=axC, fraction=0.046, pad=0.04, label="kW")
        story.append(_chart_to_image(figC, width=500, height=120))
        story.append(Paragraph("Fig 3: Heatmap of average predicted power by hour of day.", caption_style))
        story.append(Spacer(1, 15))

    # D) Data Quality & Sensor Health
    story.append(PageBreak())
    story.append(Paragraph("Data Quality & Sensor Health", section_style))
    
    # Horizontal bar chart for averages vs ranges
    figD, axD = plt.subplots(figsize=(8, 4))
    sensors = ["Current (A)", "VLL (V)", "Power Factor", "Freq (Hz)"]
    means_sens = [
        np.mean([r["current"] for r in rows]),
        np.mean([r["VLL"] for r in rows]),
        np.mean([r["power_factor"] for r in rows]),
        np.mean([r["frequency"] for r in rows]),
    ]
    colors_sens = []
    colors_sens.append("green" if 0 <= means_sens[0] <= 100 else "red")
    colors_sens.append("green" if 380 <= means_sens[1] <= 440 else "red")
    colors_sens.append("green" if 0.8 <= means_sens[2] <= 1.0 else "red")
    colors_sens.append("green" if 49 <= means_sens[3] <= 51 else "red")
    
    axD.barh(sensors, means_sens, color=colors_sens)
    axD.set_xlabel("Average Value")
    story.append(_chart_to_image(figD))
    story.append(Paragraph("Fig 4: Average sensor readings. Green indicates average is within normal operational bounds.", caption_style))
    story.append(Spacer(1, 15))

    # Anomaly Table
    story.append(Paragraph("Sensor Quality Logs", styles["Heading3"]))
    table_data = [["Timestamp", "Current (A)", "VLL (V)", "Power Factor", "Status"]]
    for r in rows[-20:]: 
        status_color = '<font color="red">ANOMALY</font>' if r["status"] == "ANOMALY" else '<font color="green">OK</font>'
        table_data.append([
            timezone.localtime(r["timestamp"]).strftime("%Y-%m-%d %H:%M"),
            f"{r['current']:.2f}",
            f"{r['VLL']:.2f}",
            f"{r['power_factor']:.3f}",
            Paragraph(status_color, normal)
        ])
    
    if len(table_data) > 1:
        sens_tbl = Table(table_data, colWidths=[120, 90, 90, 90, 100])
        sens_tbl.setStyle(_get_alternating_table_style(len(table_data)))
        story.append(sens_tbl)

    doc.build(story)
    buffer.seek(0)
    return buffer
