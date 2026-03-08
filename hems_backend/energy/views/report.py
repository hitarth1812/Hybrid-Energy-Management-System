from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, date
import math
import os
from django.conf import settings

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

from ..models import Building, UsageLog, CarbonTarget, ESGReport

EMISSION_FACTOR = 0.82

@csrf_exempt
@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def esg_report(request):
    """
    POST /api/carbon/esg-report/
    GET /api/carbon/esg-report/?building_id=
    """
    if request.method == 'GET':
        building_id = request.GET.get('building_id')
        reports = ESGReport.objects.filter(building_id=building_id).order_by('-generated_at')
        data = []
        for r in reports:
            data.append({
                "id": r.id,
                "building": r.building.name,
                "month": r.month,
                "year": r.year,
                "total_carbon_kg": r.total_carbon_kg,
                "total_energy_kwh": r.total_energy_kwh,
                "download_url": r.pdf_file.url if r.pdf_file else None,
                "generated_at": r.generated_at
            })
        return Response(data)

    elif request.method == 'POST':
        try:
            building_id = request.data.get('building_id')
            month = int(request.data.get('month'))
            year = int(request.data.get('year'))

            building = Building.objects.get(id=building_id)
            
            # Fetch Data
            logs = UsageLog.objects.filter(
                device__building=building,
                date__year=year,
                date__month=month
            )
            
            total_kwh = logs.aggregate(s=Sum('energy_kwh'))['s'] or 0
            total_carbon = logs.aggregate(s=Sum('carbon_kg'))['s'] or 0
            
            target_obj = CarbonTarget.objects.filter(building=building, year=year, month=month).first()
            target_kg = target_obj.target_kg if target_obj else None

            # Generate PDF
            filename = f"ESG_{building.name.replace(' ', '_')}_{year}_{month:02d}.pdf"
            relative_path = os.path.join('esg_reports', filename)
            abs_dir = os.path.join(settings.MEDIA_ROOT, 'esg_reports')
            os.makedirs(abs_dir, exist_ok=True)
            file_path = os.path.join(abs_dir, filename)

            # ReportLab Logic
            doc = SimpleDocTemplate(file_path, pagesize=letter)
            styles = getSampleStyleSheet()
            elements = []

            # Page 1: Cover
            elements.append(Paragraph("ESG Energy Report", styles['Title']))
            elements.append(Spacer(1, 24))
            elements.append(Paragraph(f"Building: {building.name}", styles['Heading2']))
            elements.append(Paragraph(f"Period: {date(year, month, 1).strftime('%B %Y')}", styles['Normal']))
            elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d')}", styles['Normal']))
            elements.append(PageBreak())

            # Page 2: Exec Summary
            elements.append(Paragraph("Executive Summary", styles['Heading1']))
            elements.append(Paragraph(f"Total Energy: {round(total_kwh, 2)} kWh", styles['Normal']))
            elements.append(Paragraph(f"Total Carbon: {round(total_carbon, 2)} kg CO2", styles['Normal']))
            
            status = "No Target Set"
            if target_kg:
                status = "Exceeded" if total_carbon > target_kg else "On Track"
                elements.append(Paragraph(f"Target: {target_kg} kg | Status: {status}", styles['Normal']))
            
            trees = math.ceil(total_carbon / (21/12))
            car_km = round(total_carbon / 0.21)
            
            elements.append(Spacer(1, 12))
            elements.append(Paragraph(f"Global Impact Equivalents:", styles['Heading3']))
            elements.append(Paragraph(f"- Trees needed to offset: {trees} trees", styles['Normal']))
            elements.append(Paragraph(f"- Avg Car travel equivalent: {car_km} km", styles['Normal']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph(f"Note: Emission Factor = {EMISSION_FACTOR} kg CO2/kWh (India Grid)", styles['Italic']))
            elements.append(PageBreak())

            # Page 3: Room-wise Table
            elements.append(Paragraph("Room-wise Consumption", styles['Heading1']))
            room_stats = logs.values('device__room__name').annotate(
                kwh=Sum('energy_kwh'), kg=Sum('carbon_kg')
            ).order_by('-kg')
            
            data = [['Room', 'Energy (kWh)', 'Carbon (kg)', '% of Total']]
            for r in room_stats:
                pct = round((r['kg'] / total_carbon * 100), 1) if total_carbon else 0
                data.append([
                    r['device__room__name'], 
                    round(r['kwh'], 2), 
                    round(r['kg'], 2), 
                    f"{pct}%"
                ])
            
            t = Table(data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)
            elements.append(PageBreak())

            # Page 4: Device Type Table
            elements.append(Paragraph("Device Type Breakdown", styles['Heading1']))
            type_stats = logs.values('device__device_type').annotate(
                count=Count('device', distinct=True),
                kwh=Sum('energy_kwh'), 
                kg=Sum('carbon_kg')
            ).order_by('-kg')

            data = [['Device Type', 'Count', 'kWh', 'CO2 kg', '%']]
            for d in type_stats:
                pct = round((d['kg'] / total_carbon * 100), 1) if total_carbon else 0
                data.append([
                    d['device__device_type'],
                    d['count'],
                    round(d['kwh'], 2),
                    round(d['kg'], 2),
                    f"{pct}%"
                ])
            
            t = Table(data)
            t.setStyle(TableStyle([
                 ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                 ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)
            elements.append(PageBreak())

            # Page 5: 6-Month Trend
            elements.append(Paragraph("6-Month Trend", styles['Heading1']))
            # Previous 5 months + current
            trend_data = [['Month', 'kWh', 'CO2 kg']]
            
            # Simple loop for last 6 months
            for i in range(5, -1, -1):
                m_iter = month - i
                y_iter = year
                if m_iter <= 0:
                    m_iter += 12
                    y_iter -= 1
                
                m_logs = UsageLog.objects.filter(
                    device__building=building,
                    date__year=y_iter,
                    date__month=m_iter
                ).aggregate(k=Sum('energy_kwh'), c=Sum('carbon_kg'))
                
                name = date(y_iter, m_iter, 1).strftime('%b %Y')
                trend_data.append([
                    name, 
                    round(m_logs['k'] or 0, 2), 
                    round(m_logs['c'] or 0, 2)
                ])
                
            t = Table(trend_data)
            t.setStyle(TableStyle([
                 ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                 ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)

            # Footer callback
            def footer(canvas, doc):
                canvas.saveState()
                canvas.setFont('Helvetica', 9)
                from reportlab.lib.units import inch
                canvas.drawString(inch, 0.75 * inch, "Generated by HEMS Carbon Intelligence Platform | Confidential")
                canvas.restoreState()
            
            doc.build(elements, onFirstPage=footer, onLaterPages=footer)

            # Save Model
            report = ESGReport.objects.create(
                building=building,
                month=month,
                year=year,
                total_energy_kwh=round(total_kwh, 2),
                total_carbon_kg=round(total_carbon, 2),
                target_kg=target_kg if target_kg else None,
                pdf_file=relative_path
            )

            return Response({
                "success": True,
                "download_url": report.pdf_file.url,
                "report_id": report.id
            })

        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=400)
