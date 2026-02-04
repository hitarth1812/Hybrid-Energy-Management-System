from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import DeviceViewSet, EnergyUsageViewSet

router = DefaultRouter()
router.register(r'devices', DeviceViewSet)
router.register(r'energy-usages', EnergyUsageViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
