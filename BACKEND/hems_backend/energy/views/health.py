"""
[H4] Health Check Endpoint — lightweight, non-blocking
GET /api/health/

Response:
    {"status": "ok"|"degraded", "ml_models": "...", "database": "...", "detail": {...}}

Design rules:
  - NO top-level ML imports (would block on cold-start)
  - ML probe: only inspect sys.modules — zero disk I/O if not loaded yet
  - DB probe: cursor ping (does NOT call ensure_connection which can hang)
  - Always returns < 100 ms
"""
import sys
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.db import connection

logger = logging.getLogger(__name__)


@csrf_exempt
@require_GET
def health_check(request):
    logger.info("[health] probe received from %s", request.META.get("REMOTE_ADDR", "unknown"))

    detail: dict = {}
    overall_ok = True

    # ── ML probe ──────────────────────────────────────────────────────────────
    # Only inspect sys.modules — if the predictor module isn't cached yet,
    # treat it as "not loaded" (not "degraded") so we don't trigger a heavy
    # disk import on every Render health poll.
    try:
        predictor_mod = sys.modules.get("ml_models.predictor")
        if predictor_mod is not None:
            _xgb = getattr(predictor_mod, "_xgb", None)
            _lgb = getattr(predictor_mod, "_lgb", None)
            ml_ok = (_xgb is not None) or (_lgb is not None)
            detail["ml_models"] = "ok" if ml_ok else "degraded"
            if not ml_ok:
                overall_ok = False
        else:
            # Module not imported yet — server is still warming up, not degraded
            detail["ml_models"] = "warming_up"
    except Exception as exc:  # pragma: no cover
        detail["ml_models"] = "degraded"
        detail["ml_error"] = str(exc)
        overall_ok = False

    # ── DB probe ──────────────────────────────────────────────────────────────
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        detail["database"] = "ok"
    except Exception as exc:
        detail["database"] = "degraded"
        detail["db_error"] = str(exc)
        overall_ok = False

    status_str = "ok" if overall_ok else "degraded"
    http_code = 200 if overall_ok else 503

    logger.info("[health] status=%s ml=%s db=%s", status_str, detail.get("ml_models"), detail.get("database"))

    return JsonResponse(
        {
            "status": status_str,
            "ml_models": detail.get("ml_models", "unknown"),
            "database": detail.get("database", "unknown"),
            "detail": detail,
        },
        status=http_code,
    )
