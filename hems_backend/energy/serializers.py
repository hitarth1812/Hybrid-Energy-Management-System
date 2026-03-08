from rest_framework import serializers
from .models import Device, Building, Room, Brand, DeviceCategory

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name']

class DeviceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceCategory
        fields = ['id', 'name']

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ['id', 'name']

class RoomSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    
    class Meta:
        model = Room
        fields = ['id', 'name', 'building', 'building_name', 'floor']

class DeviceSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Device
        fields = [
            'id', 'name', 'device_type', 'category', 'category_name',
            'brand', 'brand_name', 'building', 'building_name',
            'room', 'room_name', 'quantity', 'watt_rating',
            'star_rating', 'ton', 'iseer', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
