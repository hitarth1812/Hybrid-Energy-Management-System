import django_filters
from .models import Device

class DeviceFilter(django_filters.FilterSet):
    brand = django_filters.CharFilter(field_name='brand__name', lookup_expr='icontains')
    building = django_filters.CharFilter(field_name='building__name', lookup_expr='icontains')
    room = django_filters.CharFilter(field_name='room__name', lookup_expr='icontains')
    device_type = django_filters.CharFilter(lookup_expr='iexact')
    min_watt = django_filters.NumberFilter(field_name='watt_rating', lookup_expr='gte')
    max_watt = django_filters.NumberFilter(field_name='watt_rating', lookup_expr='lte')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')

    class Meta:
        model = Device
        fields = ['device_type', 'category', 'brand', 'building', 'room']
