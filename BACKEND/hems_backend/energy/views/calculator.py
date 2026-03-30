from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, F, FloatField, ExpressionWrapper, Q
from django.conf import settings
from ..models import Device, Building, Room

# [L1] Use the single-source-of-truth emission factor from settings
EMISSION_FACTOR = getattr(settings, 'EMISSION_FACTOR', 0.82)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calculate_carbon(request):
    """
    GET /api/carbon/calculate/
    Query params:
      - scope: 'room' | 'floor' | 'building'
      - room_id: int (for scope=room)
      - floor: int (for scope=floor)
      - building_id: int (for scope=floor or scope=building)
      - hours: float (duration of usage)
    Returns total watts, kWh, carbon_kg, device breakdown, and room/floor comparison.
    """
    scope = request.GET.get('scope', 'room')
    hours = float(request.GET.get('hours', 24))
    building_id = request.GET.get('building_id')
    room_id = request.GET.get('room_id')
    floor = request.GET.get('floor')

    # --- Filter devices by scope ---
    devices_qs = Device.objects.select_related('room', 'building', 'brand')

    if scope == 'room' and room_id:
        target_room = Room.objects.filter(id=room_id).select_related('building').first()
        if target_room:
            if building_id:
                devices_qs = devices_qs.filter(
                    Q(room_id=room_id) |
                    Q(building_id=building_id, room__name=target_room.name)
                )
            else:
                devices_qs = devices_qs.filter(room_id=room_id)
        else:
            devices_qs = devices_qs.filter(room_id=room_id)
    elif scope == 'floor' and building_id and floor is not None:
        # [H2] Floor is a numeric field on Room, not a separate model.
        # Filtering by room__floor is valid. 'floor' scope in the API
        # means "all rooms on that floor number within the building".
        devices_qs = devices_qs.filter(building_id=building_id, room__floor=int(floor))
    elif scope == 'building' and building_id:
        devices_qs = devices_qs.filter(building_id=building_id)
    else:
        # [H2] Return a clear 400 for any unknown/unsupported scope value
        valid_scopes = ['room', 'floor', 'building']
        if scope not in valid_scopes:
            return Response(
                {'error': f"Unknown scope '{scope}'. Valid values: {valid_scopes}"},
                status=400,
            )
        return Response({'error': 'Invalid scope or missing parameters.'}, status=400)

    if not devices_qs.exists():
        return Response({
            'total_watts': 0,
            'energy_kwh': 0,
            'carbon_kg': 0,
            'trees_needed': 0,
            'hours': hours,
            'scope': scope,
            'devices': [],
            'room_comparison': [],
            'floor_comparison': [],
        })

    # --- Device breakdown ---
    device_list = []
    total_watts = 0.0

    for d in devices_qs:
        effective_watts = d.watt_rating * d.quantity
        device_kwh = round(effective_watts * hours / 1000, 4)
        device_carbon = round(device_kwh * EMISSION_FACTOR, 4)
        total_watts += effective_watts
        device_list.append({
            'id': d.id,
            'name': d.name or d.device_type,
            'device_type': d.device_type,
            'brand': d.brand.name if d.brand else 'Unknown',
            'room': d.room.name,
            'floor': d.room.floor,
            'building': d.building.name,
            'quantity': d.quantity,
            'watt_rating': d.watt_rating,
            'effective_watts': round(effective_watts, 2),
            'energy_kwh': device_kwh,
            'carbon_kg': device_carbon,
        })

    total_kwh = round(total_watts * hours / 1000, 4)
    total_carbon = round(total_kwh * EMISSION_FACTOR, 4)
    trees_needed = round(total_carbon / (21 / 12), 1)

    # Group by room
    room_map = {}
    for d in device_list:
        key = (d['room'], d['floor'], d['building'])
        if key not in room_map:
            room_map[key] = {'room': d['room'], 'floor': d['floor'], 'building': d['building'], 'total_watts': 0, 'energy_kwh': 0, 'carbon_kg': 0, 'device_count': 0}
        room_map[key]['total_watts'] += d['effective_watts']
        room_map[key]['energy_kwh'] += d['energy_kwh']
        room_map[key]['carbon_kg'] += d['carbon_kg']
        room_map[key]['device_count'] += 1

    room_comparison = sorted(
        [
            {**v, 'total_watts': round(v['total_watts'], 2), 'energy_kwh': round(v['energy_kwh'], 4), 'carbon_kg': round(v['carbon_kg'], 4)}
            for v in room_map.values()
        ],
        key=lambda x: x['carbon_kg'],
        reverse=True
    )

    # Group by floor
    floor_map = {}
    for d in device_list:
        key = (d['floor'], d['building'])
        if key not in floor_map:
            floor_map[key] = {'floor': d['floor'], 'building': d['building'], 'total_watts': 0, 'energy_kwh': 0, 'carbon_kg': 0, 'device_count': 0}
        floor_map[key]['total_watts'] += d['effective_watts']
        floor_map[key]['energy_kwh'] += d['energy_kwh']
        floor_map[key]['carbon_kg'] += d['carbon_kg']
        floor_map[key]['device_count'] += 1

    floor_comparison = sorted(
        [
            {**v, 'total_watts': round(v['total_watts'], 2), 'energy_kwh': round(v['energy_kwh'], 4), 'carbon_kg': round(v['carbon_kg'], 4)}
            for v in floor_map.values()
        ],
        key=lambda x: x['carbon_kg'],
        reverse=True
    )

    return Response({
        'scope': scope,
        'hours': hours,
        'total_watts': round(total_watts, 2),
        'energy_kwh': total_kwh,
        'carbon_kg': total_carbon,
        'trees_needed': trees_needed,
        'devices': device_list,
        'room_comparison': room_comparison,
        'floor_comparison': floor_comparison,
    })
