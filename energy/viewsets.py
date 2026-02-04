from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Device, EnergyUsage
from .serializers import DeviceSerializer, EnergyUsageSerializer


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for all devices"""
        devices = Device.objects.all()
        total_power = sum(d.watt_rating * d.quantity for d in devices)
        total_devices = Device.objects.count()
        
        return Response({
            'total_devices': total_devices,
            'total_power_rating': total_power,
            'devices': DeviceSerializer(devices, many=True).data
        })


class EnergyUsageViewSet(viewsets.ModelViewSet):
    queryset = EnergyUsage.objects.all()
    serializer_class = EnergyUsageSerializer

    @action(detail=False, methods=['get'])
    def by_device(self, request):
        """Get energy usage for a specific device"""
        device_id = request.query_params.get('device_id')
        if device_id:
            usages = EnergyUsage.objects.filter(device_id=device_id)
        else:
            usages = EnergyUsage.objects.all()
        
        serializer = EnergyUsageSerializer(usages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get energy and emission analytics"""
        usages = EnergyUsage.objects.all()
        
        total_energy = sum(u.energy_consumed or 0 for u in usages)
        total_co2 = total_energy * 0.82  # 0.82 kg CO2 per kWh
        
        return Response({
            'total_energy_kwh': total_energy,
            'total_co2_kg': total_co2,
            'average_energy_per_usage': total_energy / usages.count() if usages.count() > 0 else 0,
            'usage_count': usages.count()
        })
