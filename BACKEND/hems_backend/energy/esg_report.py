from __future__ import annotations

from datetime import datetime, timedelta
from io import BytesIO
from typing import Any, Dict, Iterable, List, Optional, Tuple

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
        raise RuntimeError("No model predictions available")

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


def _bucket_key(ts: datetime, granularity: str) -> Tuple[int, int, int]:
    local_ts = timezone.localtime(ts)
    if granularity == "year":
        return (local_ts.year, 1, 1)
    if granularity == "month":
        return (local_ts.year, local_ts.month, 1)
    return (local_ts.year, local_ts.month, local_ts.day)


def _format_period(bucket: Tuple[int, int, int], granularity: str) -> str:
    year, month, day = bucket
    if granularity == "year":
        return f"{year}"
    if granularity == "month":
        return f"{year}-{month:02d}"
    return f"{year}-{month:02d}-{day:02d}"


def _hours_per_interval(granularity: str) -> int:
    if granularity == "year":
        return 24 * 365
    if granularity == "month":
        return 24 * 30
    return 24


def _rolling_mean(values: List[float], window: int = 7) -> List[float]:
    if not values:
        return []
    if len(values) < window:
        return [float(np.mean(values))] * len(values)
    weights = np.ones(window) / float(window)
    conv = np.convolve(values, weights, mode="valid")
    prefix = [conv[0]] * (window - 1)
    return prefix + conv.tolist()


def _extract_model_values(log: PredictionLog) -> Dict[str, float]:
    values: Dict[str, float] = {}
    snapshot = log.features_snapshot if isinstance(log.features_snapshot, dict) else {}

    for key, name in (("xgb_kw", "xgb"), ("lgb_kw", "lgb"), ("rf_kw", "rf")):
        if key in snapshot:
            values[name] = _safe_float(snapshot.get(key), 0.0)

    if hasattr(log, "xgb_kw"):
        values["xgb"] = _safe_float(getattr(log, "xgb_kw", None), values.get("xgb", 0.0))
    if hasattr(log, "lgb_kw"):
        values["lgb"] = _safe_float(getattr(log, "lgb_kw", None), values.get("lgb", 0.0))
    if hasattr(log, "rf_kw"):
        values["rf"] = _safe_float(getattr(log, "rf_kw", None), values.get("rf", 0.0))

    model_name = getattr(log, "model_name", None)
    if model_name in {"xgb", "lgb", "rf"}:
        values[model_name] = _safe_float(getattr(log, "predicted_power_kw", None), values.get(model_name, 0.0))

    return {k: v for k, v in values.items() if v is not None}


def generate_esg_report(
    user,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    granularity: str = "month",
) -> BytesIO:
    """
    Generates ESG report from PredictionLog sensor data.
    """
    granularity = (granularity or "month").lower()
    if granularity not in {"day", "month", "year"}:
        granularity = "month"

    co2_factor = float(getattr(settings, "ESG_CO2_FACTOR", 0.82))
    cost_per_kwh = float(getattr(settings, "ESG_COST_PER_KWH", 8.0))

    start_dt, end_dt = _normalize_range(date_from, date_to)
    hours_per_interval = _hours_per_interval(granularity)

    logs = list(
        PredictionLog.objects.filter(timestamp__gte=start_dt, timestamp__lte=end_dt)
        .order_by("timestamp")
    )

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

    date_label = f"{start_dt.date().isoformat()} to {end_dt.date().isoformat()}"
    stamp = timezone.localtime().strftime("%d %b %Y, %H:%M IST")

    story.append(Paragraph("ESG Energy Report", title_style))
    story.append(Paragraph("PredictionLog Sensor Analytics", subtitle_style))
    story.append(Spacer(1, 16))
    story.append(Paragraph(f"Generated: {stamp}", normal))
    story.append(Paragraph(f"Organisation: {_org_name(user)}", normal))
    story.append(Paragraph(f"Date Range: {date_label}", normal))
    story.append(Paragraph(f"Total Predictions: {len(logs)}", normal))
    story.append(Spacer(1, 24))
    story.append(Table([[" " * 140]], colWidths=[495], rowHeights=[18], style=[("BACKGROUND", (0, 0), (-1, -1), brand)]))
    story.append(PageBreak())

    if not logs:
        story.append(Paragraph("No predictions in range.", section_style))
        story.append(Paragraph("Adjust the date range to include PredictionLog entries.", normal))
        story.append(PageBreak())
        story.append(Paragraph("Methodology", section_style))
        story.append(Paragraph("All values derive from PredictionLog sensor readings.", normal))
        story.append(Paragraph("No device capacity values are used.", normal))
        story.append(Paragraph("Ensemble equals mean of available models (XGB, LGB, RF).", normal))
        story.append(Paragraph("CO2 factor: 0.82 kg/kWh. Cost: INR 8.0/kWh.", normal))
        doc.build(story)
        buffer.seek(0)
        return buffer

    rows: List[Dict[str, Any]] = []
    spreads: List[float] = []

    for log in logs:
        snapshot = log.features_snapshot if isinstance(log.features_snapshot, dict) else {}
        model_values = _extract_model_values(log)
        model_preds = [v for v in model_values.values() if v is not None]
        spread = (max(model_preds) - min(model_preds)) if len(model_preds) >= 2 else 0.0
        spreads.append(spread)

        rows.append({
            "timestamp": log.timestamp,
            "predicted_kw": _safe_float(getattr(log, "predicted_power_kw", None), 0.0),
            "xgb": model_values.get("xgb"),
            "lgb": model_values.get("lgb"),
            "rf": model_values.get("rf"),
            "current": _safe_float(snapshot.get("current"), 0.0),
            "VLL": _safe_float(snapshot.get("VLL"), 0.0),
            "VLN": _safe_float(snapshot.get("VLN"), 0.0),
            "frequency": _safe_float(snapshot.get("frequency"), 0.0),
            "power_factor": _safe_float(snapshot.get("power_factor"), 0.0),
            "spread": spread,
        })

    total_predictions = len(rows)
    all_predicted = [r["predicted_kw"] for r in rows]
    mean_kw = float(np.mean(all_predicted)) if all_predicted else 0.0
    peak_kw = float(np.max(all_predicted)) if all_predicted else 0.0
    min_kw = float(np.min(all_predicted)) if all_predicted else 0.0
    total_projected_kwh = float(np.sum(all_predicted)) * hours_per_interval
    total_co2 = total_projected_kwh * co2_factor
    total_cost = total_projected_kwh * cost_per_kwh
    mean_spread = float(np.mean(spreads)) if spreads else 0.0
    agreement_pct = max(0.0, 1.0 - (mean_spread / max(mean_kw, 0.1))) * 100.0

    summary_data = [
        ["Metric", "Value"],
        ["Total predictions", str(total_predictions)],
        ["Mean predicted kW", f"{mean_kw:.3f}"],
        ["Peak kW", f"{peak_kw:.3f}"],
        ["Min kW", f"{min_kw:.3f}"],
        ["Total projected kWh", f"{total_projected_kwh:.2f}"],
        ["CO2 (kg)", f"{total_co2:.2f}"],
        ["Cost (INR)", f"{total_cost:.2f}"],
        ["Mean ensemble spread (kW)", f"{mean_spread:.3f}"],
        ["Model agreement (%)", f"{agreement_pct:.1f}"],
        ["Date range covered", date_label],
    ]

    story.append(Paragraph("Executive Summary", section_style))
    summary_tbl = Table(summary_data, colWidths=[250, 235])
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    story.append(summary_tbl)
    story.append(PageBreak())

    buckets: Dict[Tuple[int, int, int], List[Dict[str, Any]]] = {}
    for row in rows:
        key = _bucket_key(row["timestamp"], granularity)
        buckets.setdefault(key, []).append(row)

    sorted_keys = sorted(buckets.keys())
    labels = [_format_period(k, granularity) for k in sorted_keys]
    x_positions = np.arange(len(labels))

    ensemble_series = [float(np.mean([r["predicted_kw"] for r in buckets[k]])) for k in sorted_keys]
    xgb_series = []
    lgb_series = []
    rf_series = []
    for k in sorted_keys:
        bucket_rows = buckets[k]
        xgb_vals = [r["xgb"] for r in bucket_rows if r["xgb"] is not None]
        lgb_vals = [r["lgb"] for r in bucket_rows if r["lgb"] is not None]
        rf_vals = [r["rf"] for r in bucket_rows if r["rf"] is not None]
        xgb_series.append(float(np.mean(xgb_vals)) if xgb_vals else None)
        lgb_series.append(float(np.mean(lgb_vals)) if lgb_vals else None)
        rf_series.append(float(np.mean(rf_vals)) if rf_vals else None)

    story.append(Paragraph("Model Performance Insights", section_style))

    fig1, ax1 = plt.subplots(figsize=(8, 3))
    ax1.plot(x_positions, ensemble_series, color=COLOR_ENSEMBLE, label="Ensemble")
    if any(v is not None for v in xgb_series):
        ax1.plot(x_positions, [v if v is not None else np.nan for v in xgb_series], color=COLOR_XGB, label="XGBoost")
    if any(v is not None for v in lgb_series):
        ax1.plot(x_positions, [v if v is not None else np.nan for v in lgb_series], color=COLOR_LGB, label="LightGBM")
    if any(v is not None for v in rf_series):
        ax1.plot(x_positions, [v if v is not None else np.nan for v in rf_series], color=COLOR_RF, label="RandomForest")
    ax1.set_title("Predicted kW Over Time by Model")
    ax1.set_ylabel("kW")
    ax1.legend(fontsize=8)
    ax1.set_xticks(x_positions)
    ax1.set_xticklabels(labels, rotation=30, ha="right")
    story.append(_chart_to_image(fig1))

    model_mad = []
    for model_name in ("xgb", "lgb", "rf"):
        diffs = []
        for row in rows:
            value = row.get(model_name)
            if value is not None:
                diffs.append(abs(value - row["predicted_kw"]))
        model_mad.append(float(np.mean(diffs)) if diffs else None)

    fig2, ax2 = plt.subplots(figsize=(8, 3))
    model_labels = ["XGBoost", "LightGBM", "RandomForest"]
    mad_values = [v if v is not None else 0.0 for v in model_mad]
    ax2.bar(model_labels, mad_values, color=[COLOR_XGB, COLOR_LGB, COLOR_RF])
    ax2.set_title("Mean Absolute Deviation from Ensemble")
    ax2.set_ylabel("kW")
    story.append(_chart_to_image(fig2))

    fig3, ax3 = plt.subplots(figsize=(8, 3))
    if spreads:
        ax3.hist(spreads, bins=12, color=COLOR_ENSEMBLE, edgecolor="#333333")
        ax3.set_title("Distribution of Ensemble Spread")
        ax3.set_xlabel("Spread (kW)")
        ax3.set_ylabel("Frequency")
        story.append(_chart_to_image(fig3))
    else:
        plt.close(fig3)
        story.append(Paragraph("No per-model predictions available for spread analysis.", normal))

    stats_data = [["Model", "Mean kW", "Std", "Min", "Max", "MAD vs Ensemble"]]
    for label, key in (("XGBoost", "xgb"), ("LightGBM", "lgb"), ("RandomForest", "rf")):
        values = [r[key] for r in rows if r.get(key) is not None]
        diffs = [abs(r[key] - r["predicted_kw"]) for r in rows if r.get(key) is not None]
        if values:
            stats_data.append([
                label,
                f"{np.mean(values):.3f}",
                f"{np.std(values):.3f}",
                f"{np.min(values):.3f}",
                f"{np.max(values):.3f}",
                f"{np.mean(diffs):.3f}" if diffs else "0.000",
            ])
        else:
            stats_data.append([label, "N/A", "N/A", "N/A", "N/A", "N/A"])

    stats_tbl = Table(stats_data, colWidths=[110, 70, 70, 70, 70, 100])
    stats_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(stats_tbl)
    story.append(PageBreak())

    story.append(Paragraph("Prediction Trend Analysis", section_style))
    rolling = _rolling_mean(ensemble_series, window=7)
    fig4, ax4 = plt.subplots(figsize=(8, 3))
    ax4.fill_between(x_positions, ensemble_series, color=COLOR_ENSEMBLE, alpha=0.3)
    ax4.plot(x_positions, ensemble_series, color=COLOR_ENSEMBLE, label="Ensemble")
    ax4.plot(x_positions, rolling, color=COLOR_RF, linestyle="--", label="7-period Rolling Avg")
    ax4.set_title("Total Predicted kW Trend")
    ax4.set_ylabel("kW")
    ax4.legend(fontsize=8)
    ax4.set_xticks(x_positions)
    ax4.set_xticklabels(labels, rotation=30, ha="right")
    story.append(_chart_to_image(fig4))

    hour_buckets: Dict[int, List[float]] = {}
    dow_buckets: Dict[int, List[float]] = {}
    for row in rows:
        ts = timezone.localtime(row["timestamp"])
        hour_buckets.setdefault(ts.hour, []).append(row["predicted_kw"])
        dow_buckets.setdefault(ts.weekday(), []).append(row["predicted_kw"])

    hour_labels = list(range(24))
    hour_means = [float(np.mean(hour_buckets.get(h, [0.0]))) for h in hour_labels]
    fig5, ax5 = plt.subplots(figsize=(8, 3))
    ax5.bar(hour_labels, hour_means, color=COLOR_XGB)
    ax5.set_title("Predicted kW by Hour of Day")
    ax5.set_xlabel("Hour")
    ax5.set_ylabel("kW")
    story.append(_chart_to_image(fig5))

    dow_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    dow_means = [float(np.mean(dow_buckets.get(i, [0.0]))) for i in range(7)]
    fig6, ax6 = plt.subplots(figsize=(8, 3))
    ax6.bar(dow_labels, dow_means, color=COLOR_LGB)
    ax6.set_title("Predicted kW by Day of Week")
    ax6.set_ylabel("kW")
    story.append(_chart_to_image(fig6))

    peak_idx = int(np.argmax(ensemble_series)) if ensemble_series else 0
    low_idx = int(np.argmin(ensemble_series)) if ensemble_series else 0
    peak_period = labels[peak_idx] if labels else "N/A"
    low_period = labels[low_idx] if labels else "N/A"

    trend = "stable"
    if len(ensemble_series) >= 2 and ensemble_series[0] > 0:
        delta = (ensemble_series[-1] - ensemble_series[0]) / max(ensemble_series[0], 0.1)
        if delta > 0.05:
            trend = "up"
        elif delta < -0.05:
            trend = "down"

    story.append(Paragraph(f"Peak period: {peak_period}", normal))
    story.append(Paragraph(f"Lowest period: {low_period}", normal))
    story.append(Paragraph(f"Trend direction: {trend}", normal))
    story.append(PageBreak())

    story.append(Paragraph("Energy and Carbon Projections", section_style))
    proj_data = [["Period", "Predictions", "Mean kW", "Est. kWh", "CO2 (kg)", "Cost (INR)"]]
    kwh_series = []
    co2_series = []
    for key in sorted_keys:
        bucket_rows = buckets[key]
        preds = [r["predicted_kw"] for r in bucket_rows]
        mean_bucket = float(np.mean(preds)) if preds else 0.0
        sum_bucket = float(np.sum(preds)) if preds else 0.0
        kwh = sum_bucket * hours_per_interval
        co2 = kwh * co2_factor
        cost = kwh * cost_per_kwh
        label = _format_period(key, granularity)
        proj_data.append([
            label,
            str(len(bucket_rows)),
            f"{mean_bucket:.3f}",
            f"{kwh:.2f}",
            f"{co2:.2f}",
            f"{cost:.2f}",
        ])
        kwh_series.append(kwh)
        co2_series.append(co2)

    proj_tbl = Table(proj_data, colWidths=[90, 80, 70, 80, 80, 85])
    proj_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(proj_tbl)

    fig7, ax7 = plt.subplots(figsize=(8, 3))
    ax7.plot(x_positions, kwh_series, color=COLOR_ENSEMBLE, label="kWh")
    ax7.plot(x_positions, co2_series, color=COLOR_LGB, label="CO2 (kg)")
    ax7.set_title("kWh and CO2 Over Time")
    ax7.legend(fontsize=8)
    ax7.set_xticks(x_positions)
    ax7.set_xticklabels(labels, rotation=30, ha="right")
    story.append(_chart_to_image(fig7))
    story.append(PageBreak())

    story.append(Paragraph("Sensor Parameter Distribution", section_style))
    sensor_metrics = {
        "current": [],
        "VLL": [],
        "VLN": [],
        "frequency": [],
        "power_factor": [],
    }
    for row in rows:
        for key in sensor_metrics:
            sensor_metrics[key].append(row[key])

    sensor_data = [["Metric", "Mean", "Std"]]
    for key, label in (("current", "Current (A)"), ("VLL", "VLL (V)"), ("VLN", "VLN (V)"), ("frequency", "Frequency (Hz)"), ("power_factor", "Power Factor")):
        values = sensor_metrics[key]
        sensor_data.append([
            label,
            f"{np.mean(values):.3f}" if values else "0.000",
            f"{np.std(values):.3f}" if values else "0.000",
        ])

    sensor_tbl = Table(sensor_data, colWidths=[180, 140, 140])
    sensor_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(sensor_tbl)

    fig8, ax8 = plt.subplots(figsize=(8, 3))
    current_series = [float(np.mean([r["current"] for r in buckets[k]])) for k in sorted_keys]
    ax8.plot(x_positions, current_series, color=COLOR_XGB, label="Current (A)")
    ax8.set_title("Current (A) Trend")
    ax8.set_ylabel("Amps")
    ax8.legend(fontsize=8)
    ax8.set_xticks(x_positions)
    ax8.set_xticklabels(labels, rotation=30, ha="right")
    story.append(_chart_to_image(fig8))
    story.append(PageBreak())

    story.append(Paragraph("Methodology", section_style))
    story.append(Paragraph("All values derive from real sensor readings in PredictionLog.", normal))
    story.append(Paragraph("Device capacity values are not used in any calculation.", normal))
    story.append(Paragraph("Ensemble equals mean of available models (XGB, LGB, RF).", normal))
    story.append(Paragraph("CO2 factor: 0.82 kg/kWh. Cost: INR 8.0/kWh.", normal))

    doc.build(story)
    buffer.seek(0)
    return buffer
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
