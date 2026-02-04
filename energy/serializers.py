from rest_framework import serializers
from .models import Device, EnergyUsage


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'building', 'room', 'device_type', 'quantity', 'watt_rating', 'hours_used_per_day', 'created_at']
        read_only_fields = ['id', 'created_at']


class EnergyUsageSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EnergyUsage
        fields = ['id', 'device', 'device_name', 'date', 'hours_used', 'energy_consumed', 'created_at']
        read_only_fields = ['id', 'energy_consumed', 'created_at']
    
    def get_device_name(self, obj):
        return f"{obj.device.device_type} - {obj.device.room}"
