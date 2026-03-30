"""
[H4 follow-up] Health Check Endpoint
GET /api/health/ — returns HTTP 200 if all subsystems OK, 503 if degraded.
Response:
    {
        "status": "ok" | "degraded",
        "ml_models": "ok" | "degraded",
        "database": "ok" | "degraded",
        "detail": { ... }
    }
Use this from your deployment pipeline / load-balancer health probe.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from rest_framework import status as drf_status


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    detail = {}
    overall_ok = True

    # --- ML Models ---
    try:
        from ml_models.predictor import _xgb, _lr  # noqa: F401
        ml_ok = (_xgb is not None) and (_lr is not None)
    except Exception as e:
        ml_ok = False
        detail['ml_error'] = str(e)

    detail['ml_models'] = 'ok' if ml_ok else 'degraded'
    if not ml_ok:
        overall_ok = False

    # --- Database ---
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception as e:
        db_ok = False
        detail['db_error'] = str(e)

    detail['database'] = 'ok' if db_ok else 'degraded'
    if not db_ok:
        overall_ok = False

    http_status = drf_status.HTTP_200_OK if overall_ok else drf_status.HTTP_503_SERVICE_UNAVAILABLE

    return Response({
        'status': 'ok' if overall_ok else 'degraded',
        'ml_models': detail['ml_models'],
        'database': detail['database'],
        'detail': detail,
    }, status=http_status)
