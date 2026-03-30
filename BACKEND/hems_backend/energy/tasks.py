"""
[C2] Celery task: generate ESG PDF report in a background worker process.

This replaces the threading.Thread approach in views/report.py, which is
fragile under Gunicorn (worker restart orphans the thread; no retry on crash).

Celery gives us:
  - Automatic retry on failure (max 3 attempts, 60s back-off)
  - Task state stored in django-celery-results (DB)
  - ESGReport.status stays in sync regardless of which worker picks it up
  - Clean worker crash recovery
"""
import logging
import math
import os
from datetime import datetime, date

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,        # seconds between auto-retries
    acks_late=True,                # acknowledge only after the task succeeds
    reject_on_worker_lost=True,    # re-queue if the worker crashes mid-flight
    name='energy.tasks.generate_esg_pdf',
)
def generate_esg_pdf(self, report_id: int) -> None:
    """
    Build the ESG PDF for the given report_id and persist the result.
    On unrecoverable failure, mark the report status='error'.
    """
    # Local imports keep the module importable even if reportlab isn't installed yet
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer,
        Table, TableStyle, PageBreak,
    )
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from django.db.models import Sum, Count

    from energy.models import Building, UsageLog, CarbonTarget, ESGReport

    try:
        report = ESGReport.objects.get(id=report_id)
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
        car_km = round(total_carbon / 0.21)
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

        # Room-wise Table
        elements.append(Paragraph("Room-wise Consumption", styles['Heading1']))
        room_stats = logs.values('device__room__name').annotate(
            kwh=Sum('energy_kwh'), kg=Sum('carbon_kg')
        ).order_by('-kg')
        data = [['Room', 'Energy (kWh)', 'Carbon (kg)', '% of Total']]
        for r in room_stats:
            pct = round((r['kg'] / total_carbon * 100), 1) if total_carbon else 0
            data.append([r['device__room__name'], round(r['kwh'], 2), round(r['kg'], 2), f"{pct}%"])
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(t)
        elements.append(PageBreak())

        # Device Type Table
        elements.append(Paragraph("Device Type Breakdown", styles['Heading1']))
        type_stats = logs.values('device__device_type').annotate(
            count=Count('device', distinct=True),
            kwh=Sum('energy_kwh'),
            kg=Sum('carbon_kg'),
        ).order_by('-kg')
        data = [['Device Type', 'Count', 'kWh', 'CO2 kg', '%']]
        for d in type_stats:
            pct = round((d['kg'] / total_carbon * 100), 1) if total_carbon else 0
            data.append([d['device__device_type'], d['count'], round(d['kwh'], 2), round(d['kg'], 2), f"{pct}%"])
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
        report.save()
        logger.info(f"ESG PDF generated for report {report_id}")

    except Exception as exc:
        logger.exception(f"ESG PDF generation failed for report {report_id}: {exc}")
        try:
            ESGReport.objects.filter(id=report_id).update(status='error')
        except Exception:
            pass
        # Let Celery retry on transient errors
        raise self.retry(exc=exc)
