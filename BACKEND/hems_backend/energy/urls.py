from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .viewsets import DeviceViewSet, BuildingViewSet, RoomViewSet, BrandViewSet, DeviceCategoryViewSet
# from .views_smart import smart_upload_preview, smart_upload_save  # REMOVED
from . import views

router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'buildings', BuildingViewSet, basename='building')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'categories', DeviceCategoryViewSet, basename='category')

urlpatterns = [
    
    path('smart-upload/preview/', views.smart_upload_preview),
    path('smart-upload/save/', views.smart_upload_save),

    
    path('usage/log/', views.log_usage),
    path('usage/logs/', views.get_usage_logs),
    path('carbon/dashboard/', views.carbon_dashboard),
    path('carbon/by-building/', views.carbon_by_building),
    path('carbon/by-room/', views.carbon_by_room),
    path('carbon/by-device-type/', views.carbon_by_device_type),
    path('carbon/target/', views.set_carbon_target),
    path('carbon/monthly-trend/', views.monthly_trend),
    path('carbon/esg-report/', views.esg_report),
    path('carbon/esg-report/stream/<int:report_id>/', views.esg_report_stream),
    path('carbon/esg-report/download/<str:token>/', views.esg_report_download),
    path('carbon/calculate/', views.calculate_carbon),
    
    path('energy/report/', views.download_power_report, name='power-report'),
    path('energy/esg-report/', views.download_esg_report, name='esg-report'),
    
    # [C1] POST predict/ is internal-only (auth required); GET predict/time/ is the public endpoint
    path('predict/', views.predict_power, name='predict-power'),
    path('predict/light/', views.predict_light_view, name='predict-light'),
    path('predict/time/', views.predict_by_time, name='predict-by-time'),

    # [H4] Deployment health probe — no auth required, safe for load-balancers
    path('health/', views.health_check, name='health-check'),

    path('', include(router.urls)),
]
