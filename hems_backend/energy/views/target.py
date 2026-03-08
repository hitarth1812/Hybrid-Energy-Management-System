from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from ..models import CarbonTarget

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def set_carbon_target(request):
    """
    POST /api/carbon/target/
    Payload: { building_id, month, year, target_kg }
    """
    try:
        building_id = request.data.get('building_id')
        month = int(request.data.get('month'))
        year = int(request.data.get('year'))
        target_kg = float(request.data.get('target_kg'))

        target, created = CarbonTarget.objects.update_or_create(
            building_id=building_id,
            month=month,
            year=year,
            defaults={'target_kg': target_kg}
        )
        return Response({"success": True, "target_kg": target.target_kg})
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=400)
