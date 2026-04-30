import io
from io import BytesIO
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_power_prediction_report(prediction_data: dict, model_type: str = "power") -> BytesIO:
    """
    Returns a BytesIO buffer containing the PDF.
    MUST call buffer.seek(0) before returning.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    brand_color = colors.HexColor('#0C4B33')
    
    title_style = ParagraphStyle(
        name='CoverTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=20,
        textColor=brand_color,
        alignment=1
    )
    subtitle_style = ParagraphStyle(
        name='CoverSubtitle',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=40,
        textColor=colors.gray,
        alignment=1
    )
    h1_style = ParagraphStyle(
        name='H1',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=12,
        textColor=brand_color
    )
    
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # -------------------------------------------------------------------------
    # PAGE 1: Cover
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 150))
    story.append(Paragraph("Power Prediction Report - ARKA Energy Nexus", title_style))
    story.append(Paragraph("Power Model" if model_type == "power" else "Light/Appliance Model", subtitle_style))
    story.append(Spacer(1, 50))
    story.append(Paragraph(f"Generated: {date_str}", ParagraphStyle(name='Centered', parent=styles['Normal'], alignment=1)))
    story.append(PageBreak())
    
    # -------------------------------------------------------------------------
    # PAGE 2: Executive Summary Table
    # -------------------------------------------------------------------------
    story.append(Paragraph("Executive Summary", h1_style))
    story.append(Spacer(1, 10))
    
    metrics = prediction_data.get("performance", {})
    table_data = [['Model', 'MAE', 'RMSE', 'R<super>2</super>']]
    
    rows = ['xgboost', 'lightgbm', 'randomforest', 'ensemble']
    row_labels = ['XGBoost', 'LightGBM', 'Random Forest', 'Ensemble']
    for i, row in enumerate(rows):
        m = metrics.get(row, {"mae": 0.0, "rmse": 0.0, "r2": 0.0})
        table_data.append([row_labels[i], f"{m['mae']:.4f}", f"{m['rmse']:.4f}", f"{m['r2']:.4f}"])
        
    t = Table(table_data, colWidths=[150, 100, 100, 100])
    tStyle = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), brand_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.beige),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor('#d4edda'))
    ])
    t.setStyle(tStyle)
    story.append(t)
    story.append(PageBreak())
    
    # -------------------------------------------------------------------------
    # PAGE 3: Actual vs Predicted Chart
    # -------------------------------------------------------------------------
    story.append(Paragraph("Actual vs Predicted Chart", h1_style))
    story.append(Spacer(1, 10))
    
    actuals = prediction_data.get("actuals", [])
    predictions = prediction_data.get("predictions", [])
    
    fig, ax = plt.subplots(figsize=(8, 4))
    if len(actuals) > 0 and len(predictions) > 0:
        ax.plot(actuals, label='Actual (kW)', color='blue')
        ax.plot(predictions, label='Ensemble Predicted (kW)', color='orange')
    ax.set_title("Actual vs Predicted Power")
    ax.set_xlabel("Time Index")
    ax.set_ylabel("Power (kW)")
    ax.legend()
    ax.grid(True, linestyle='--', alpha=0.6)
    
    chart_buf1 = BytesIO()
    plt.savefig(chart_buf1, format='png', bbox_inches='tight')
    plt.close(fig)
    chart_buf1.seek(0)
    story.append(Image(chart_buf1, width=450, height=200))
    story.append(PageBreak())
    
    # -------------------------------------------------------------------------
    # PAGE 4: Cross-Validation R2 Bar Chart
    # -------------------------------------------------------------------------
    story.append(Paragraph("Cross-Validation R<super>2</super> Scores", h1_style))
    story.append(Spacer(1, 10))
    
    cv_scores = prediction_data.get("cv_r2", {})
    fig, axes = plt.subplots(1, 3, figsize=(10, 4), sharey=True)
    models = ['xgboost', 'lightgbm', 'randomforest']
    labels = ['XGBoost', 'LightGBM', 'Random Forest']
    colors_list = ['#4e9af1', '#29d4a0', '#f1a94e']
    
    for i, m_name in enumerate(models):
        ax = axes[i]
        scores = cv_scores.get(m_name, [0]*5)
        folds = [f"F{j+1}" for j in range(len(scores))]
        ax.bar(folds, scores, color=colors_list[i])
        ax.set_title(labels[i])
        if scores:
            mean_val = sum(scores)/max(1, len(scores))
            ax.axhline(mean_val, color='red', linestyle='--', label='Mean')
        if i == 0:
            ax.set_ylabel("R^2 Score")
            ax.legend()
    
    plt.tight_layout()
    chart_buf2 = BytesIO()
    plt.savefig(chart_buf2, format='png', bbox_inches='tight')
    plt.close(fig)
    chart_buf2.seek(0)
    story.append(Image(chart_buf2, width=450, height=200))
    story.append(PageBreak())
    
    # -------------------------------------------------------------------------
    # PAGE 5: Feature Importance Table
    # -------------------------------------------------------------------------
    story.append(Paragraph("Feature Importance (Top 10)", h1_style))
    story.append(Spacer(1, 10))
    
    feat_imp = prediction_data.get("feature_importance", {})
    if isinstance(feat_imp, dict):
        feat_imp = sorted(feat_imp.items(), key=lambda x: x[1], reverse=True)
        
    fi_data = [['Feature Name', 'Importance Score']]
    for feat, score in feat_imp[:10]:
        fi_data.append([feat, f"{score:.4f}"])
        
    t_fi = Table(fi_data, colWidths=[200, 150])
    t_fi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), brand_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,1), (-1,-1), colors.whitesmoke),
    ]))
    story.append(t_fi)
    story.append(PageBreak())
    
    # -------------------------------------------------------------------------
    # PAGE 6: Prediction Details Table
    # -------------------------------------------------------------------------
    story.append(Paragraph("Prediction Details Table", h1_style))
    story.append(Spacer(1, 10))
    
    details = prediction_data.get("history", [])
    det_data = [['Timestamp', 'Input Features', 'Predicted kW', 'Confidence Band']]
    for d in details[-20:]:
        ts = d.get('timestamp', '')
        feats = str(d.get('features', ''))[:30] + '...'
        pred = f"{d.get('predicted_kw', d.get('predicted', 0)):.2f}"
        conf = f"{d.get('confidence', 0.0)*100:.1f}%"
        det_data.append([ts, feats, pred, conf])
        
    if len(det_data) == 1:
        det_data.append(['N/A', 'N/A', 'N/A', 'N/A'])
        
    t_det = Table(det_data, colWidths=[110, 180, 80, 100])
    t_det.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), brand_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
    ]))
    story.append(t_det)
    story.append(PageBreak())
    
    # -------------------------------------------------------------------------
    # PAGE 7: Model Configuration Summary
    # -------------------------------------------------------------------------
    story.append(Paragraph("Model Configuration Summary", h1_style))
    story.append(Spacer(1, 10))
    
    config = prediction_data.get("config", {})
    conf_text = [
        f"<b>FEATURES:</b> {config.get('features', 'current, VLL, VLN, frequency, power_factor, hour, day_of_week, is_weekend, month, power_lag_1, power_lag_5, power_lag_10, rolling_mean_5, rolling_std_5')}",
        f"<b>LAG_STEPS:</b> {config.get('lag_steps', '1, 5, 10')}",
        f"<b>ROLLING_WIN:</b> {config.get('rolling_win', '5')}",
        f"<b>N_CV_SPLITS:</b> {config.get('n_cv_splits', '5')}",
        f"<b>TRAIN_RATIO:</b> {config.get('train_ratio', '0.8')}",
        "<br/><b>Hyperparameters:</b>",
        f"<i>XGBoost:</i> {config.get('xgb_params', 'Default')}",
        f"<i>LightGBM:</i> {config.get('lgb_params', 'Default')}",
        f"<i>Random Forest:</i> {config.get('rf_params', 'Default')}",
    ]
    
    for c_line in conf_text:
        story.append(Paragraph(c_line, styles['Normal']))
        story.append(Spacer(1, 5))
        
    doc.build(story)
    buffer.seek(0)
    return buffer
