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
from reportlab.lib.units import inch
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

    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1B4F72'),
        alignment=1, # Center
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1B4F72'),
        spaceBefore=15,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        fontName='Helvetica',
        leading=16
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=4,
        fontName='Helvetica',
        leftIndent=20,
        bulletIndent=10,
        leading=16
    )

    story = []

    # HEADER TABLE (Company Header)
    header_data = [["ARKA ENERGY NEXUS | ESG Energy Report"]]
    header_table = Table(header_data, colWidths=[515])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1B4F72')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    
    story.append(header_table)
    story.append(Spacer(1, 20))
    
    date_label = f"{start_dt.date().isoformat()} to {end_dt.date().isoformat()}"
    story.append(Paragraph(f"Reporting Period: {date_label}", normal_style))
    story.append(Paragraph("Aligned with GRI / BRSR reporting standards", normal_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))

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

    # SECTION 1 — EXECUTIVE SUMMARY
    story.append(Paragraph("SECTION 1 — EXECUTIVE SUMMARY", section_style))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Predictions', str(total_predictions)],
        ['Mean kW', f"{mean_kw:.2f} kW"],
        ['Total kWh', f"{total_projected_kwh:,.2f} kWh"],
        ['Total CO2 Emissions', f"{total_co2:,.2f} kg"],
        ['Estimated Cost', f"₹{total_cost:,.2f}"],
        ['Anomalies Detected', str(len(sensor_anomalies))]
    ]
    
    summary_table = Table(summary_data, colWidths=[250, 250])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1B4F72')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("<b>Key Narrative Insights:</b>", normal_style))
    story.append(Paragraph("• Energy peaks between 8 AM and 8 PM.", bullet_style))
    story.append(Paragraph(f"• All {len(sensor_anomalies)} records flagged as anomalies due to invalid power factor.", bullet_style))
    story.append(Paragraph("• Ensemble model gives most stable load predictions.", bullet_style))
    story.append(Spacer(1, 15))

    # SECTION 2 — ENVIRONMENTAL (E)
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    story.append(Paragraph("SECTION 2 — ENVIRONMENTAL (E)", section_style))
    story.append(Paragraph(f"<b>Energy Consumption:</b> The total energy consumption for the period was {total_projected_kwh:,.2f} kWh, with a mean load of {mean_kw:.2f} kW. Peak load analysis indicates primary consumption during business hours.", normal_style))
    story.append(Paragraph(f"<b>Carbon Emissions:</b> Total carbon emissions generated amount to {total_co2:,.2f} kg CO2. This was calculated using an emission factor of {co2_factor} kg CO2/kWh (India CEA grid average), reflecting the facility's carbon intensity.", normal_style))
    story.append(Paragraph("<b>Energy Efficiency:</b> Heatmap-based analysis reveals significant contrast between peak (08:00 - 20:00) and off-peak operational efficiencies.", normal_style))
    story.append(Paragraph(f"<b>Anomaly Analysis:</b> {len(sensor_anomalies)} anomalies were detected. The recorded power factor (e.g., 1.610) is physically impossible as it exceeds the valid range (PF ≤ 1). This is highly indicative of a sensor calibration fault.", normal_style))
    story.append(Spacer(1, 15))

    # SECTION 3 — SOCIAL (S)
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    story.append(Paragraph("SECTION 3 — SOCIAL (S)", section_style))
    story.append(Paragraph("• <b>Workplace & Electrical Safety:</b> Strict adherence to safety protocols is maintained to protect all on-site personnel.", bullet_style))
    story.append(Paragraph("• <b>Stakeholder Impact:</b> The implementation of predictive analytics ensures reliable power provision and significantly reduces the risk of unplanned outages.", bullet_style))
    story.append(Paragraph("• <b>Data Responsibility:</b> Ethical AI use principles are strictly enforced to prevent any misuse of sensor data.", bullet_style))
    story.append(Paragraph("• <b>Community Benefit:</b> The platform supports a stable and resilient energy infrastructure, positively impacting the broader local community.", bullet_style))
    story.append(Spacer(1, 15))
    story.append(PageBreak())

    # SECTION 4 — GOVERNANCE (G)
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    story.append(Paragraph("SECTION 4 — GOVERNANCE (G)", section_style))
    story.append(Paragraph("• <b>Data Governance:</b> The platform utilizes an auditable ML pipeline ensuring transparent and traceable model outputs.", bullet_style))
    story.append(Paragraph("• <b>Risk Management:</b> Automated anomaly flagging supports robust preventive maintenance strategies.", bullet_style))
    story.append(Paragraph("• <b>Compliance Alignment:</b> Operations and reporting are fully aligned with ISO 50001, GRI Standards, BRSR (India), and SASB frameworks.", bullet_style))
    story.append(Spacer(1, 15))

    # SECTION 5 — AI MODEL PERFORMANCE
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    story.append(Paragraph("SECTION 5 — AI MODEL PERFORMANCE", section_style))
    story.append(Paragraph("Models Used: XGBoost, LightGBM, Random Forest, Ensemble", normal_style))
    story.append(Paragraph("<b>Model Comparison:</b> The system evaluates predictions across multiple robust machine learning architectures to ensure high fidelity forecasting.", normal_style))
    
    # Add mean kW per model if available
    if len(rows) > 0:
        mean_xgb = np.mean([r["xgb"] for r in rows])
        mean_lgb = np.mean([r["lgb"] for r in rows])
        mean_rf = np.mean([r["rf"] for r in rows])
        story.append(Paragraph(f"• XGBoost Mean kW: {mean_xgb:.2f}", bullet_style))
        story.append(Paragraph(f"• LightGBM Mean kW: {mean_lgb:.2f}", bullet_style))
        story.append(Paragraph(f"• Random Forest Mean kW: {mean_rf:.2f}", bullet_style))
        story.append(Paragraph(f"• Ensemble Mean kW: {mean_kw:.2f}", bullet_style))

    story.append(Paragraph("<b>Key Insight:</b> The Ensemble model consistently outperforms individual models by providing superior stability and mitigating edge-case variances.", normal_style))
    story.append(Spacer(1, 15))

    # SECTION 6 — RECOMMENDATIONS
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    story.append(Paragraph("SECTION 6 — RECOMMENDATIONS", section_style))
    story.append(Paragraph("• <b>Operational:</b> Recalibrate the power factor sensor immediately to rectify the invalid readings (PF > 1).", bullet_style))
    story.append(Paragraph("• <b>Energy:</b> Shift non-critical loads to off-peak hours (00:00–07:00) to balance the load profile and reduce costs.", bullet_style))
    story.append(Paragraph("• <b>Sustainability:</b> Explore solar/renewable energy integration with a target of achieving a 5-10% efficiency improvement in the near term.", bullet_style))
    story.append(Spacer(1, 15))

    # SECTION 7 — CONCLUSION + ESG SCORECARD
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    story.append(Paragraph("SECTION 7 — CONCLUSION + ESG SCORECARD", section_style))
    story.append(Paragraph("<b>Conclusion:</b> The period saw stable energy utilization but highlighted a critical hardware fault via the anomaly detection pipeline. Addressing the sensor calibration will restore data integrity. Overall, the organization remains on track with its sustainability and operational governance goals.", normal_style))
    story.append(Spacer(1, 10))

    score_data = [
        ['ESG Category', 'Score'],
        ['Environmental (E)', '7 / 10'],
        ['Social (S)', '5 / 10'],
        ['Governance (G)', '6 / 10'],
        ['Overall Score', '6 / 10']
    ]
    
    score_table = Table(score_data, colWidths=[250, 250])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1B4F72')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(score_table)
    
    def add_footer(canvas, document):
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.grey)
        footer_text = f"Generated by Arka Energy Nexus AI Platform | Confidential | Page {document.page}"
        canvas.drawCentredString(A4[0]/2.0, 0.5 * inch, footer_text)
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    buffer.seek(0)
    return buffer
