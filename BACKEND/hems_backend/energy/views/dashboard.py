from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q
from django.db.models.functions import ExtractMonth
from django.conf import settings
from datetime import datetime, date
from ..models import UsageLog, Building, CarbonTarget

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carbon_dashboard(request):
    """
    GET /api/carbon/dashboard/?building=&year=&month=
    """
    building_id = request.GET.get('building')
    year = int(request.GET.get('year', datetime.now().year))
    month = int(request.GET.get('month', datetime.now().month))
    today = date.today()

    # Base QuerySet
    logs = UsageLog.objects.all()
    if building_id:
        logs = logs.filter(device__building_id=building_id)

    # Today
    today_logs = logs.filter(date=today).aggregate(
        kwh=Sum('energy_kwh'), kg=Sum('carbon_kg')
    )
    
    # This Month
    month_logs = logs.filter(date__year=year, date__month=month).aggregate(
        kwh=Sum('energy_kwh'), kg=Sum('carbon_kg')
    )

    # This Year
    year_logs = logs.filter(date__year=year).aggregate(
        kwh=Sum('energy_kwh'), kg=Sum('carbon_kg')
    )

    # Top Rooms (This Month)
    top_rooms_qs = logs.filter(date__year=year, date__month=month).values(
        'device__room__name', 'device__building__name'
    ).annotate(
        carbon_kg=Sum('carbon_kg')
    ).order_by('-carbon_kg')[:8]
    
    top_rooms = [
        {
            "room": item['device__room__name'], 
            "building": item['device__building__name'],
            "carbon_kg": round(item['carbon_kg'], 2)
        } 
        for item in top_rooms_qs
    ]

    # Top Device Types (This Month)
    top_device_types_qs = logs.filter(date__year=year, date__month=month).values(
        'device__device_type'
    ).annotate(
        carbon_kg=Sum('carbon_kg'),
        energy_kwh=Sum('energy_kwh')
    ).order_by('-carbon_kg')[:6]

    top_device_types = [
        {
            "device_type": item['device__device_type'],
            "carbon_kg": round(item['carbon_kg'], 2),
            "energy_kwh": round(item['energy_kwh'], 2)
        }
        for item in top_device_types_qs
    ]

    # Monthly Trend (All 12 months)
    trend_qs = logs.filter(date__year=year).annotate(
        month=ExtractMonth('date')
    ).values('month').annotate(
        energy_kwh=Sum('energy_kwh'),
        carbon_kg=Sum('carbon_kg')
    ).order_by('month')

    trend_map = {item['month']: item for item in trend_qs}
    monthly_trend = []
    for m in range(1, 13):
        item = trend_map.get(m, {'energy_kwh': 0, 'carbon_kg': 0})
        # Format month name
        month_name = date(year, m, 1).strftime('%b')
        monthly_trend.append({
            "month": m,
            "month_name": month_name,
            "energy_kwh": round(item['energy_kwh'] or 0, 2),
            "carbon_kg": round(item['carbon_kg'] or 0, 2)
        })

    return Response({
        "today": {
            "energy_kwh": round(today_logs['kwh'] or 0, 2),
            "carbon_kg": round(today_logs['kg'] or 0, 2)
        },
        "this_month": {
            "energy_kwh": round(month_logs['kwh'] or 0, 2),
            "carbon_kg": round(month_logs['kg'] or 0, 2)
        },
        "this_year": {
            "energy_kwh": round(year_logs['kwh'] or 0, 2),
            "carbon_kg": round(year_logs['kg'] or 0, 2)
        },
        "top_rooms": top_rooms,
        "top_device_types": top_device_types,
        "monthly_trend": monthly_trend
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carbon_by_building(request):
    """
    GET /api/carbon/by-building/?year=&month=
    """
    year = int(request.GET.get('year', datetime.now().year))
    month = int(request.GET.get('month', datetime.now().month))

    buildings = Building.objects.all()
    results = []

    for b in buildings:
        # Aggregates for this building, this month
        stats = UsageLog.objects.filter(
            device__building=b,
            date__year=year,
            date__month=month
        ).aggregate(
            kwh=Sum('energy_kwh'),
            kg=Sum('carbon_kg'),
            dev_count=Count('device', distinct=True)
        )
        
        carbon_kg = round(stats['kg'] or 0, 2)
        energy_kwh = round(stats['kwh'] or 0, 2)
        device_count = stats['dev_count']

        # Target
        target_obj = CarbonTarget.objects.filter(building=b, year=year, month=month).first()
        target_kg = target_obj.target_kg if target_obj else None
        
        percent_of_target = 0
        status = "no_target"
        
        if target_kg:
            percent_of_target = round((carbon_kg / target_kg) * 100, 2)
            status = "exceeded" if carbon_kg > target_kg else "on_track"
        
        results.append({
            "building_id": b.id,
            "building": b.name,
            "energy_kwh": energy_kwh,
            "carbon_kg": carbon_kg,
            "target_kg": target_kg,
            "percent_of_target": percent_of_target,
            "status": status,
            "device_count": device_count
        })

    # Sort by carbon_kg desc
    results.sort(key=lambda x: x['carbon_kg'], reverse=True)
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carbon_by_room(request):
    """
    GET /api/carbon/by-room/?building=&year=&month=
    """
    building_id = request.GET.get('building')
    year = int(request.GET.get('year', datetime.now().year))
    month = int(request.GET.get('month', datetime.now().month))
    
    qs = UsageLog.objects.filter(date__year=year, date__month=month)
    if building_id:
        qs = qs.filter(device__building_id=building_id)
        
    # Group by Room
    room_stats = qs.values(
        'device__room__name', 'device__building__name'
    ).annotate(
        kwh=Sum('energy_kwh'),
        kg=Sum('carbon_kg'),
        dev_count=Count('device', distinct=True)
    )
    
    # Single query for all room×device_type combos — avoids N+1
    type_stats = qs.values(
        'device__room__name', 'device__building__name', 'device__device_type'
    ).annotate(kg=Sum('carbon_kg'))

    top_type_map = {}
    for t in type_stats:
        key = (t['device__room__name'], t['device__building__name'])
        if key not in top_type_map or t['kg'] > top_type_map[key][1]:
            top_type_map[key] = (t['device__device_type'], t['kg'])

    results = []
    for item in room_stats:
        room_name = item['device__room__name']
        building_name = item['device__building__name']
        key = (room_name, building_name)
        top_type_name = top_type_map[key][0] if key in top_type_map else "N/A"

        results.append({
            "room": room_name,
            "building": building_name,
            "energy_kwh": round(item['kwh'] or 0, 2),
            "carbon_kg": round(item['kg'] or 0, 2),
            "top_device_type": top_type_name,
            "device_count": item['dev_count']
        })
        
    results.sort(key=lambda x: x['carbon_kg'], reverse=True)
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carbon_by_device_type(request):
    """
    GET /api/carbon/by-device-type/?building=&year=&month=
    """
    building_id = request.GET.get('building')
    year = int(request.GET.get('year', datetime.now().year))
    month = int(request.GET.get('month', datetime.now().month))
    
    qs = UsageLog.objects.filter(date__year=year, date__month=month)
    if building_id:
        qs = qs.filter(device__building_id=building_id)
        
    stats = qs.values('device__device_type').annotate(
        kwh=Sum('energy_kwh'),
        kg=Sum('carbon_kg'),
        count=Count('device', distinct=True)
    ).order_by('-kg')
    
    results = [
        {
            "device_type": item['device__device_type'],
            "carbon_kg": round(item['kg'] or 0, 2),
            "energy_kwh": round(item['kwh'] or 0, 2),
            "count": item['count']
        }
        for item in stats
    ]
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_trend(request):
    """
    GET /api/carbon/monthly-trend/?building=&year=
    """
    building_id = request.GET.get('building')
    year = int(request.GET.get('year', datetime.now().year))
    
    logs = UsageLog.objects.filter(date__year=year)
    if building_id:
        logs = logs.filter(device__building_id=building_id)
        
    trend_qs = logs.annotate(
        month=ExtractMonth('date')
    ).values('month').annotate(
        energy_kwh=Sum('energy_kwh'),
        carbon_kg=Sum('carbon_kg')
    ).order_by('month')
    
    # Needs targets too
    targets = CarbonTarget.objects.filter(year=year)
    if building_id:
        targets = targets.filter(building_id=building_id)
    
    target_map = {t.month: t.target_kg for t in targets}
    trend_map = {item['month']: item for item in trend_qs}
    
    monthly_trend = []
    for m in range(1, 13):
        item = trend_map.get(m, {'energy_kwh': 0, 'carbon_kg': 0})
        tgt = target_map.get(m, None)
        
        month_name = date(year, m, 1).strftime('%b')
        monthly_trend.append({
            "month": m,
            "month_name": month_name,
            "energy_kwh": round(item['energy_kwh'] or 0, 2),
            "carbon_kg": round(item['carbon_kg'] or 0, 2),
            "target_kg": tgt
        })
        
    return Response(monthly_trend)
