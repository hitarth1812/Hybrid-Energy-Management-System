from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from ..models import Device, UsageLog

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_usage(request):
    """
    POST /api/usage/log/
    Payload: { device_id, date, hours_used }
    """
    try:
        device_id = request.data.get('device_id')
        date_str = request.data.get('date')
        hours_used = float(request.data.get('hours_used', 0))

        device = Device.objects.get(id=device_id)
        
        # update_or_create logic
        log, created = UsageLog.objects.update_or_create(
            device=device,
            date=date_str,
            defaults={'hours_used': hours_used}
        )
        
        # Force save to trigger calculation method if updated
        if not created:
            log.save()

        return Response({
            "success": True,
            "energy_kwh": log.energy_kwh,
            "carbon_kg": log.carbon_kg,
            "date": log.date
        })
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_usage_logs(request):
    """
    GET /api/usage/logs/?device_id=&date_from=&date_to=
    """
    device_id = request.GET.get('device_id')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')

    logs = UsageLog.objects.select_related('device', 'device__room', 'device__building').all()

    if device_id:
        logs = logs.filter(device_id=device_id)
    if date_from:
        logs = logs.filter(date__gte=date_from)
    if date_to:
        logs = logs.filter(date__lte=date_to)

    data = []
    for log in logs:
        data.append({
            "id": log.id,
            "device_name": log.device.name,
            "room": log.device.room.name,
            "building": log.device.building.name,
            "date": log.date,
            "hours_used": log.hours_used,
            "energy_kwh": log.energy_kwh,
            "carbon_kg": log.carbon_kg
        })

    return Response(data)
