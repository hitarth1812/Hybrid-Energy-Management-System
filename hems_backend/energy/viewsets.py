from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from .models import Device, Building, Room, Brand, DeviceCategory
from .serializers import (
    DeviceSerializer, BuildingSerializer, RoomSerializer, 
    BrandSerializer, DeviceCategorySerializer
)
from .filters import DeviceFilter
from django.conf import settings

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    # Ensure creation is allowed without authentication for now, or check permissions
    authentication_classes = [] 
    permission_classes = []

class DeviceCategoryViewSet(viewsets.ModelViewSet):
    queryset = DeviceCategory.objects.all()
    serializer_class = DeviceCategorySerializer
    authentication_classes = [] 
    permission_classes = []

class BuildingViewSet(viewsets.ModelViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    authentication_classes = []
    permission_classes = []

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    authentication_classes = []
    permission_classes = []
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['building']

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.select_related(
        'building', 'room', 'brand', 'category'
    ).order_by('-created_at')
    
    serializer_class = DeviceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DeviceFilter
    search_fields = ['name', 'brand__name', 'building__name', 'room__name', 'device_type']
    ordering_fields = ['created_at', 'brand__name', 'building__name', 'watt_rating']
    authentication_classes = [] 
    permission_classes = []

    @action(detail=False, methods=['get'])
    def metadata(self, request):
        # Dynamically get distinct device types used in the DB
        existing_types = Device.objects.values_list('device_type', flat=True).distinct().order_by('device_type')
        # Default types to always include
        default_types = ['AC', 'FAN', 'LIGHT', 'PC', 'ELECTRONICS', 'OTHER']
        # Merge and unique
        all_types = sorted(list(set(list(existing_types) + default_types)))
        
        # Format for frontend Select: [value, label]
        type_choices = [[t, t] for t in all_types]

        return Response({
            'buildings': BuildingSerializer(Building.objects.all(), many=True).data,
            'rooms': RoomSerializer(Room.objects.select_related('building').all(), many=True).data,
            'brands': BrandSerializer(Brand.objects.all(), many=True).data,
            'categories': DeviceCategorySerializer(DeviceCategory.objects.all(), many=True).data,
            'types': type_choices
        })
    
    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        count, _ = Device.objects.all().delete()
        return Response({'message': f'Deleted {count} devices'})
