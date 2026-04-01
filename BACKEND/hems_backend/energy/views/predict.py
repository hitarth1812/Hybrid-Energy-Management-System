import logging
import math
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

from ml_models.predictor import predict, FEATURES
from energy.models import PredictionLog

logger = logging.getLogger(__name__)

HOUR_POWER_AVG = {
    0: 15, 1: 12, 2: 11, 3: 10, 4: 10, 5: 12, 6: 18,
    7: 25, 8: 30, 9: 35, 10: 38, 11: 40, 12: 38, 13: 37,
    14: 38, 15: 36, 16: 35, 17: 33, 18: 30, 19: 28,
    20: 25, 21: 22, 22: 20, 23: 17,
}

HOUR_CURRENT_AVG = {
    0: 22, 1: 18, 2: 16, 3: 15, 4: 15, 5: 18, 6: 26,
    7: 35, 8: 42, 9: 49, 10: 53, 11: 56, 12: 53, 13: 52,
    14: 53, 15: 50, 16: 49, 17: 46, 18: 42, 19: 39,
    20: 35, 21: 31, 22: 28, 23: 24,
}


class PredictView(APIView):

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "This endpoint requires authentication."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

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
            if "predicted_power_kw" in result:
                result["predicted_co2_kg"] = round(result["predicted_power_kw"] * 0.45, 2)
            return Response(result)
        except Exception as exc:
            logger.exception("predict_power error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PredictByTimeView(APIView):

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

        hour = dt.hour
        dow = dt.weekday()
        is_weekend = 1 if dow >= 5 else 0

        avg_power = HOUR_POWER_AVG.get(hour, 25.0)
        avg_current = HOUR_CURRENT_AVG.get(hour, 35.0)

        if is_weekend:
            avg_power *= 0.6
            avg_current *= 0.6

        features = {
            "current": round(avg_current, 2),
            "VLL": 424.0,
            "VLN": 245.0,
            "frequency": 50.03,
            "power_factor": 1.61,
            "hour": hour,
            "day_of_week": dow,
            "is_weekend": is_weekend,
            "month": dt.month,
            "power_lag_1": round(avg_power, 2),
            "power_lag_5": round(avg_power, 2),
            "power_lag_10": round(avg_power, 2),
            "rolling_mean_5": round(avg_power, 2),
            "rolling_std_5": 2.0,
        }

        result = predict(features)

        if result.get("fallback"):
            return Response(
                {"error": result["error"], "fallback": True},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from django.utils.timezone import make_aware, is_naive
        if is_naive(dt):
            dt = make_aware(dt)

        try:
            PredictionLog.objects.create(
                timestamp=dt,
                predicted_power_kw=result.get("predicted_power_kw", 0),
                features_snapshot=features,
            )
        except Exception as e:
            logger.error(f"Failed to save PredictionLog: {e}")

        result["forecast_time"] = dt_str
        result["day_type"] = "Weekend" if is_weekend else "Weekday"
        result["load_level"] = (
            "Low" if avg_power < 20 else
            "Medium" if avg_power < 35 else
            "High" if avg_power < 45 else
            "Peak"
        )
        if "predicted_power_kw" in result:
            result["predicted_co2_kg"] = round(result["predicted_power_kw"] * 0.45, 2)
        return Response(result)


predict_power = PredictView.as_view()
predict_by_time = PredictByTimeView.as_view()
