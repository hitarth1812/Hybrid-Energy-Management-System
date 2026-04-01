"""
[C2] Celery task: generate ESG PDF report in a background worker process.
"""
import logging
import math
import os
import time
from datetime import datetime, date

from celery import shared_task
from django.conf import settings
from django.core.signing import dumps as signing_dumps

logger = logging.getLogger(__name__)

# --- FIX 6: ERROR STATUS & FULL ERROR PROPAGATION ---
@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
    name='energy.tasks.generate_esg_pdf',
)
def generate_esg_pdf(self, report_id: int, user_email: str = None) -> None:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer,
        Table, TableStyle, PageBreak,
    )
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from django.db.models import Sum, Count
    from django.core.mail import send_mail

    from energy.models import Building, UsageLog, CarbonTarget, ESGReport

    report = ESGReport.objects.get(pk=report_id)
    
    start_time = time.time()
    
    try:
        report.status = 'processing'
        report.save(update_fields=['status'])

        building = report.building
        month = report.month
        year = report.year

        logs = UsageLog.objects.filter(
            device__building=building,
            date__year=year,
            date__month=month,
        )

        total_kwh = logs.aggregate(s=Sum('energy_kwh'))['s'] or 0
        total_carbon = logs.aggregate(s=Sum('carbon_kg'))['s'] or 0
        target_obj = CarbonTarget.objects.filter(
            building=building, year=year, month=month
        ).first()
        target_kg = target_obj.target_kg if target_obj else None
        emission_factor = getattr(settings, 'EMISSION_FACTOR', 0.82)

        filename = f"ESG_{building.name.replace(' ', '_')}_{year}_{month:02d}.pdf"
        relative_path = os.path.join('esg_reports', filename)
        abs_dir = os.path.join(settings.MEDIA_ROOT, 'esg_reports')
        os.makedirs(abs_dir, exist_ok=True)
        file_path = os.path.join(abs_dir, filename)

        doc = SimpleDocTemplate(file_path, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Cover
        elements.append(Paragraph("ESG Energy Report", styles['Title']))
        elements.append(Spacer(1, 24))
        elements.append(Paragraph(f"Building: {building.name}", styles['Heading2']))
        elements.append(Paragraph(f"Period: {date(year, month, 1).strftime('%B %Y')}", styles['Normal']))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d')}", styles['Normal']))
        elements.append(PageBreak())

        # Executive Summary
        elements.append(Paragraph("Executive Summary", styles['Heading1']))
        elements.append(Paragraph(f"Total Energy: {round(total_kwh, 2)} kWh", styles['Normal']))
        elements.append(Paragraph(f"Total Carbon: {round(total_carbon, 2)} kg CO2", styles['Normal']))
        if target_kg:
            carbon_status = "Exceeded" if total_carbon > target_kg else "On Track"
            elements.append(Paragraph(f"Target: {target_kg} kg | Status: {carbon_status}", styles['Normal']))
        trees = math.ceil(total_carbon / (21 / 12))
        car_km = round(total_carbon / 0.21) if total_carbon > 0 else 0
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("Global Impact Equivalents:", styles['Heading3']))
        elements.append(Paragraph(f"- Trees needed to offset: {trees} trees", styles['Normal']))
        elements.append(Paragraph(f"- Avg Car travel equivalent: {car_km} km", styles['Normal']))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(
            f"Note: Emission Factor = {emission_factor} kg CO2/kWh (India Grid)",
            styles['Italic'],
        ))
        elements.append(PageBreak())

        # --- FIX 7: PAGINATED INDEXED USAGELOG QUERIES ---
        # Instead of multiple queries or python loops, we utilize a single optimized group-by DB aggregation.
        # Room-wise aggregation
        summary_room = (UsageLog.objects
            .filter(device__building_id=building.id, date__month=month, date__year=year)
            .values('device__room__name')
            .annotate(total_kwh=Sum('energy_kwh'), total_carbon_kg=Sum('carbon_kg'))
            .order_by('-total_carbon_kg')
        )
        
        elements.append(Paragraph("Room-wise Consumption", styles['Heading1']))
        data = [['Room', 'Energy (kWh)', 'Carbon (kg)', '% of Total']]
        for r in summary_room:
            pct = round((r['total_carbon_kg'] / total_carbon * 100), 1) if (total_carbon and r['total_carbon_kg']) else 0
            room_name = r.get('device__room__name') or "Unknown"
            data.append([room_name, round(r['total_kwh'] or 0, 2), round(r['total_carbon_kg'] or 0, 2), f"{pct}%"])
            
        if len(data) > 1:
            t = Table(data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(t)
        
        elements.append(PageBreak())

        # Device Type aggregation
        elements.append(Paragraph("Device Type Breakdown", styles['Heading1']))
        summary_type = (UsageLog.objects
            .filter(device__building_id=building.id, date__month=month, date__year=year)
            .values('device__device_type')
            .annotate(total_kwh=Sum('energy_kwh'), total_carbon_kg=Sum('carbon_kg'))
            .order_by('-total_carbon_kg')
        )
        data = [['Device Type', 'kWh', 'CO2 kg', '%']]
        for d in summary_type:
            pct = round((d['total_carbon_kg'] / total_carbon * 100), 1) if (total_carbon and d['total_carbon_kg']) else 0
            dev_type = d.get('device__device_type') or "Unknown"
            data.append([dev_type, round(d['total_kwh'] or 0, 2), round(d['total_carbon_kg'] or 0, 2), f"{pct}%"])
            
        if len(data) > 1:
            t = Table(data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(t)
            
        elements.append(PageBreak())

        # 6-Month Trend
        elements.append(Paragraph("6-Month Trend", styles['Heading1']))
        trend_data = [['Month', 'kWh', 'CO2 kg']]
        for i in range(5, -1, -1):
            m_iter = month - i
            y_iter = year
            if m_iter <= 0:
                m_iter += 12
                y_iter -= 1
            m_logs = UsageLog.objects.filter(
                device__building=building, date__year=y_iter, date__month=m_iter
            ).aggregate(k=Sum('energy_kwh'), c=Sum('carbon_kg'))
            name = date(y_iter, m_iter, 1).strftime('%b %Y')
            trend_data.append([name, round(m_logs['k'] or 0, 2), round(m_logs['c'] or 0, 2)])
        
        t = Table(trend_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(t)

        def footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 9)
            canvas.drawString(inch, 0.75 * inch, "Generated by HEMS Carbon Intelligence Platform | Confidential")
            canvas.restoreState()

        doc.build(elements, onFirstPage=footer, onLaterPages=footer)

        # Persist results
        report.pdf_file = relative_path
        report.total_energy_kwh = round(total_kwh, 2)
        report.total_carbon_kg = round(total_carbon, 2)
        report.target_kg = target_kg
        report.status = 'done'
        report.save(update_fields=['status', 'pdf_file', 'total_energy_kwh', 'total_carbon_kg', 'target_kg'])
        
        logger.info(f"ESG PDF generated for report {report_id}")
        
        # --- FIX 12: EMAIL NOTIFICATION AFTER 3 MIN TIMEOUT ---
        elapsed = time.time() - start_time
        if elapsed > 180 and user_email:
            token = signing_dumps(report.id)
            # Send notification simulating real mail architecture.
            try:
                base_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8000')
                signed_url_full = f"{base_url}/api/carbon/esg-report/download/{token}/"
                send_mail(
                    "Your Async ESG Report is Ready",
                    f"Your requested report took longer than 3 minutes to generate.\n\n"
                    f"It has now completed successfully. You can download it securely using the 1-hour expiring link below:\n\n"
                    f"{signed_url_full}",
                    settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@arkaenergy.com',
                    [user_email],
                    fail_silently=True
                )
            except Exception as mail_err:
                logger.warning(f"Failed to send timeout completion email: {mail_err}")

    except Exception as exc:
        report.status = 'error'
        report.error_message = str(exc)
        report.save(update_fields=['status', 'error_message'])
        logger.exception(f"ESG PDF generation failed for report {report_id}: {exc}")
        # Re-raise so Celery retries up to max_retries
        raise self.retry(exc=exc)
