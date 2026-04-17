"""
URL configuration for hems_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from energy.views import LogoutView, me, get_analytics, get_forecast
from django.conf import settings
from django.conf.urls.static import static


# ── Root ping — ZERO dependencies, always fast, no auth ───────────────────────
def ping(request):
    """
    GET /ping/
    Instant liveness probe for Render / load-balancers.
    Does NOT touch the DB, ML models, or any heavy import.
    """
    return JsonResponse({"message": "pong"})


urlpatterns = [
    # ── Liveness / readiness probes ────────────────────────────────────────────
    path("ping/", ping, name="ping"),                    # root-level liveness (no auth, no DB)
    # /api/health/ is handled by energy.urls → energy/views/health.py

    # ── Admin ──────────────────────────────────────────────────────────────────
    path("admin/", admin.site.urls),

    # ── Auth ───────────────────────────────────────────────────────────────────
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="token_blacklist"),
    path("api/auth/me/", me, name="auth_me"),

    # ── App routes ─────────────────────────────────────────────────────────────
    path("api/", include("energy.urls")),

    # Root-level analytics and forecast endpoints for frontend compatibility
    path("analytics/", get_analytics, name="analytics"),
    path("forecast/", get_forecast, name="forecast"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
