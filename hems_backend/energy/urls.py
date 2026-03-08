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
    path('carbon/calculate/', views.calculate_carbon),

    path('', include(router.urls)),
]
