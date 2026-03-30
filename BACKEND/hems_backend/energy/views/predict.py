import logging
import math
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated

from ml_models.predictor import predict, FEATURES
from energy.models import PredictionLog

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# [C1] POST /api/predict/ — internal/service use only (no feature injection)
# [H1] Rate-limited via UserRateThrottle / AnonRateThrottle
# ---------------------------------------------------------------------------
class PredictView(APIView):
    """
    POST /api/predict/
    Internal-only endpoint.  All 30 feature columns are computed server-side;
    the request body is intentionally ignored (or may carry an API key header
    for service-to-service authentication in future).
    External callers should use GET /api/predict/time/?datetime= instead.
    """
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def post(self, request):
        # Reject public access – require authenticated service caller
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "This endpoint requires authentication."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Feature dict must be supplied by *server-side* callers only.
        # We still accept it here so internal scripts can POST a pre-built
        # feature dict, but we no longer expose any public surface for it.
        data = request.data
        missing = [f for f in FEATURES if f not in data]
        if missing:
            return Response(
                {"error": f"Missing features: {missing}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = predict(data)
            if result.get("fallback"):
                return Response(
                    {"error": result["error"], "fallback": True},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(result)
        except Exception as exc:
            logger.exception("predict_power error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# [C1] GET /api/predict/time/?datetime=<ISO8601>
# The ONLY public-facing prediction endpoint.  Accepts one safe param.
# [H1] Also throttled.
# ---------------------------------------------------------------------------
class PredictByTimeView(APIView):
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def get(self, request):
        dt_str = request.GET.get("datetime")
        if not dt_str:
            return Response(
                {"error": "Pass ?datetime=2026-03-22T15:00:00"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dt = datetime.fromisoformat(dt_str)
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DDTHH:MM:SS"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- All feature engineering is done SERVER-SIDE here [C1] ---
        hour = dt.hour
        dow = dt.weekday()

        hour_avg = {
            0: 15, 1: 12, 2: 11, 3: 10, 4: 10, 5: 12, 6: 18,
            7: 25, 8: 30, 9: 35, 10: 38, 11: 40, 12: 38, 13: 37,
            14: 38, 15: 36, 16: 35, 17: 33, 18: 30, 19: 28,
            20: 25, 21: 22, 22: 20, 23: 17,
        }
        avg = hour_avg.get(hour, 25.0)
        if dow >= 5:
            avg *= 0.6

        features = {
            "power_factor": 0.91,
            "VLN": 231.0,
            "kVA": round(avg / 0.91, 4),
            "kVAR": 5.0,
            "volt_ratio": 1.0,
            "specific_pwr": 0.72,
            "hour": hour,
            "dow": dow,
            "month": dt.month,
            "week": int(dt.isocalendar()[1]),
            "is_biz_hour": 1 if 9 <= hour <= 18 else 0,
            "hour_sin": round(math.sin(2 * math.pi * hour / 24), 6),
            "hour_cos": round(math.cos(2 * math.pi * hour / 24), 6),
            "kw_lag_1": avg,
            "kw_lag_5": avg,
            "kw_lag_10": avg,
            "kw_lag_30": avg,
            "kw_lag_60": avg,
            "kw_roll_mean_5": avg,
            "kw_roll_mean_30": avg,
            "kw_roll_std_10": 2.0,
            "kw_roll_max_10": round(avg * 1.1, 4),
            "kw_delta": 0,
            "kw_delta2": 0,
            "volt_sag": 0,
            "volt_swell": 0,
            "pf_poor": 0,
            "vll_stability": 1.5,
            "load_cat_enc": 0 if avg < 20 else 1 if avg < 35 else 2,
        }

        result = predict(features)

        # [H4] Surface model-unavailable as 503
        if result.get("fallback"):
            return Response(
                {"error": result["error"], "fallback": True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Ensure datetime is timezone-aware for the database
        from django.utils.timezone import make_aware, is_naive
        if is_naive(dt):
            dt = make_aware(dt)

        # Log to the database for ML monitoring
        try:
            PredictionLog.objects.create(
                timestamp=dt,
                predicted_power_kw=result.get("predicted_power_kw", 0),
                p10_kw=result.get("p10_kw"),
                p90_kw=result.get("p90_kw"),
                features_snapshot=features
            )
        except Exception as e:
            logger.error(f"Failed to save PredictionLog: {e}")

        result["forecast_time"] = dt_str
        result["day_type"] = "Weekend" if dow >= 5 else "Weekday"
        result["load_level"] = "Low" if avg < 20 else "Medium" if avg < 35 else "High"
        return Response(result)


# ---------------------------------------------------------------------------
# Keep the old function-based names so urls.py imports don't break.
# They simply delegate to the class-based views above.
# ---------------------------------------------------------------------------
predict_power = PredictView.as_view()
predict_by_time = PredictByTimeView.as_view()
