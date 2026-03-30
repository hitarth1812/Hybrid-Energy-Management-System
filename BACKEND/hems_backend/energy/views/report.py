from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, date
from django.conf import settings
import logging
import math
import os

from ..models import Building, UsageLog, CarbonTarget, ESGReport

logger = logging.getLogger(__name__)

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

from ..models import Building, UsageLog, CarbonTarget, ESGReport

# ---------------------------------------------------------------------------
# [C2] PDF generation dispatched via Celery for production-grade reliability.
# Falls back to a daemon thread when Celery/Redis is unavailable in dev.
# ---------------------------------------------------------------------------


@csrf_exempt
@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def esg_report(request):
    """
    GET  /api/carbon/esg-report/?building_id=   — list reports
    POST /api/carbon/esg-report/                — queue new report (returns immediately)
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
                "generated_at": r.generated_at,
                "status": getattr(r, 'status', 'done'),
            })
        return Response(data)

    elif request.method == 'POST':
        try:
            building_id = request.data.get('building_id')
            month = int(request.data.get('month'))
            year = int(request.data.get('year'))

            building = Building.objects.get(id=building_id)

            # [C2] Create the report row immediately with status='pending'
            report = ESGReport.objects.create(
                building=building,
                month=month,
                year=year,
                total_energy_kwh=0,
                total_carbon_kg=0,
                status='pending',
            )

            # [C2] Dispatch to Celery; fall back to a daemon thread if broker is down
            try:
                from energy.tasks import generate_esg_pdf
                generate_esg_pdf.delay(report.id)
                logger.info(f"ESG report {report.id} queued via Celery")
            except Exception as celery_err:
                logger.warning(
                    f"Celery unavailable ({celery_err}); falling back to thread for report {report.id}"
                )
                import threading
                from reportlab.lib.pagesizes import letter  # noqa: ensure reportlab importable
                from energy.tasks import generate_esg_pdf as _task_fn

                def _thread_fallback():
                    # Run the task body synchronously in a daemon thread
                    _task_fn.run(report.id)

                t = threading.Thread(target=_thread_fallback, daemon=True)
                t.start()

            return Response({
                "status": "queued",
                "report_id": report.id,
            })

        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=400)
