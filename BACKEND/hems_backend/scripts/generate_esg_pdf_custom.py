from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.platypus.flowables import HRFlowable
import os

def build_pdf():
    file_path = "ARKA_ESG_Energy_Report.pdf"
    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
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

    elements = []

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
    
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("Reporting Period: 2026-04-02 to 2026-05-01", normal_style))
    elements.append(Paragraph("Aligned with GRI / BRSR reporting standards", normal_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))

    # SECTION 1 — EXECUTIVE SUMMARY
    elements.append(Paragraph("SECTION 1 — EXECUTIVE SUMMARY", section_style))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Predictions', '89'],
        ['Mean kW', '20.19 kW'],
        ['Total kWh', '14,533.64 kWh'],
        ['Total CO2 Emissions', '11,917.59 kg'],
        ['Estimated Cost', '₹1,16,269.15'],
        ['Anomalies Detected', '89']
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
    
    elements.append(summary_table)
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph("<b>Key Narrative Insights:</b>", normal_style))
    elements.append(Paragraph("• Energy peaks between 8 AM and 8 PM.", bullet_style))
    elements.append(Paragraph("• All 89 records flagged as anomalies due to invalid power factor.", bullet_style))
    elements.append(Paragraph("• Ensemble model gives most stable load predictions.", bullet_style))
    elements.append(Spacer(1, 15))

    # SECTION 2 — ENVIRONMENTAL (E)
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    elements.append(Paragraph("SECTION 2 — ENVIRONMENTAL (E)", section_style))
    elements.append(Paragraph("<b>Energy Consumption:</b> The total energy consumption for the period was 14,533.64 kWh, with a mean load of 20.19 kW. Peak load analysis indicates primary consumption during business hours.", normal_style))
    elements.append(Paragraph("<b>Carbon Emissions:</b> Total carbon emissions generated amount to 11,917.59 kg CO2. This was calculated using an emission factor of 0.82 kg CO2/kWh (India CEA grid average), reflecting the facility's carbon intensity.", normal_style))
    elements.append(Paragraph("<b>Energy Efficiency:</b> Heatmap-based analysis reveals significant contrast between peak (08:00 - 20:00) and off-peak operational efficiencies.", normal_style))
    elements.append(Paragraph("<b>Anomaly Analysis:</b> 89 anomalies were detected. The recorded power factor (1.610) is physically impossible as it exceeds the valid range (PF ≤ 1). This is highly indicative of a sensor calibration fault.", normal_style))
    elements.append(Spacer(1, 15))

    # SECTION 3 — SOCIAL (S)
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    elements.append(Paragraph("SECTION 3 — SOCIAL (S)", section_style))
    elements.append(Paragraph("• <b>Workplace & Electrical Safety:</b> Strict adherence to safety protocols is maintained to protect all on-site personnel.", bullet_style))
    elements.append(Paragraph("• <b>Stakeholder Impact:</b> The implementation of predictive analytics ensures reliable power provision and significantly reduces the risk of unplanned outages.", bullet_style))
    elements.append(Paragraph("• <b>Data Responsibility:</b> Ethical AI use principles are strictly enforced to prevent any misuse of sensor data.", bullet_style))
    elements.append(Paragraph("• <b>Community Benefit:</b> The platform supports a stable and resilient energy infrastructure, positively impacting the broader local community.", bullet_style))
    elements.append(Spacer(1, 15))

    # SECTION 4 — GOVERNANCE (G)
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    elements.append(Paragraph("SECTION 4 — GOVERNANCE (G)", section_style))
    elements.append(Paragraph("• <b>Data Governance:</b> The platform utilizes an auditable ML pipeline ensuring transparent and traceable model outputs.", bullet_style))
    elements.append(Paragraph("• <b>Risk Management:</b> Automated anomaly flagging supports robust preventive maintenance strategies.", bullet_style))
    elements.append(Paragraph("• <b>Compliance Alignment:</b> Operations and reporting are fully aligned with ISO 50001, GRI Standards, BRSR (India), and SASB frameworks.", bullet_style))
    elements.append(PageBreak())

    # SECTION 5 — AI MODEL PERFORMANCE
    elements.append(Paragraph("SECTION 5 — AI MODEL PERFORMANCE", section_style))
    elements.append(Paragraph("Models Used: XGBoost, LightGBM, Random Forest, Ensemble", normal_style))
    elements.append(Paragraph("<b>Model Comparison:</b> The system evaluates predictions across multiple robust machine learning architectures to ensure high fidelity forecasting.", normal_style))
    elements.append(Paragraph("<b>Key Insight:</b> The Ensemble model consistently outperforms individual models by providing superior stability and mitigating edge-case variances.", normal_style))
    elements.append(Spacer(1, 15))

    # SECTION 6 — RECOMMENDATIONS
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    elements.append(Paragraph("SECTION 6 — RECOMMENDATIONS", section_style))
    elements.append(Paragraph("• <b>Operational:</b> Recalibrate the power factor sensor immediately to rectify the invalid readings (PF > 1).", bullet_style))
    elements.append(Paragraph("• <b>Energy:</b> Shift non-critical loads to off-peak hours (00:00–07:00) to balance the load profile and reduce costs.", bullet_style))
    elements.append(Paragraph("• <b>Sustainability:</b> Explore solar/renewable energy integration with a target of achieving a 5-10% efficiency improvement in the near term.", bullet_style))
    elements.append(Spacer(1, 15))

    # SECTION 7 — CONCLUSION + ESG SCORECARD
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1B4F72'), spaceAfter=15))
    elements.append(Paragraph("SECTION 7 — CONCLUSION + ESG SCORECARD", section_style))
    elements.append(Paragraph("<b>Conclusion:</b> The period saw stable energy utilization but highlighted a critical hardware fault via the anomaly detection pipeline. Addressing the sensor calibration will restore data integrity. Overall, the organization remains on track with its sustainability and operational governance goals.", normal_style))
    elements.append(Spacer(1, 10))

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
    
    elements.append(score_table)
    
    # FOOTER FUNCTION
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.grey)
        footer_text = f"Generated by Arka Energy Nexus AI Platform | Confidential | Page {doc.page}"
        canvas.drawCentredString(A4[0]/2.0, 0.5 * inch, footer_text)
        canvas.restoreState()

    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"Report generated successfully at {file_path}")

if __name__ == "__main__":
    build_pdf()
