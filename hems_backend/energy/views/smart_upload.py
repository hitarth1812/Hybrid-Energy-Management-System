from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.conf import settings
from django.db import transaction
import os
import uuid
import math

from ..models import Device, Building, Room, Brand
from ..services.device_parser import DeviceSpreadsheetParser

@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser])
def smart_upload_preview(request):
    """
    Handle file upload and return parsed device preview using AI.
    Does NOT save to database.
    """
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        file = request.FILES['file']
        
        # Save to temporary file
        temp_dir = os.path.join(settings.BASE_DIR, 'temp_uploads')
        os.makedirs(temp_dir, exist_ok=True)
        
        file_ext = os.path.splitext(file.name)[1]
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        with open(temp_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        # Parse using DeviceSpreadsheetParser
        parser = DeviceSpreadsheetParser()
        use_llm = request.query_params.get('use_llm', 'true').lower() == 'true'
        
        devices_data = parser.parse_spreadsheet(temp_path, use_llm=use_llm)
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        # Sanitize data: Replace NaN with None for valid JSON
        sanitized_devices = []
        for device in devices_data:
            clean_device = {}
            for k, v in device.items():
                if isinstance(v, float) and math.isnan(v):
                    clean_device[k] = None
                else:
                    clean_device[k] = v
            sanitized_devices.append(clean_device)
        
        return JsonResponse({
            'success': True,
            'count': len(sanitized_devices),
            'devices': sanitized_devices
        })
        
    except Exception as e:
        try:
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@parser_classes([JSONParser])
def smart_upload_save(request):
    """
    Save list of devices to database.
    Expected payload: { "devices": [...] }
    """
    devices_data = request.data.get('devices', [])
    
    if not devices_data:
        return Response({'error': 'No devices provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    saved_count = 0
    errors = []
    
    try:
        with transaction.atomic():
            for index, data in enumerate(devices_data):
                try:
                    # Get or create building
                    building_name = data.get('building') or 'Default Building'
                    building, _ = Building.objects.get_or_create(name=building_name)

                    # Get or create room
                    room_name = data.get('room') or 'Unknown Room'
                    room, _ = Room.objects.get_or_create(name=room_name, building=building)
                    
                    # Get or create brand
                    brand_name = data.get('brand') or 'Generic'
                    brand_obj, _ = Brand.objects.get_or_create(name=brand_name)

                    # Create device
                    # Handle flexible numeric inputs
                    qty = int(data.get('quantity') or 1)
                    rating = float(data.get('watt_rating') or 0)
                    hrs = float(data.get('hours_used_per_day') or 0)
                    
                    # Optional fields
                    star = data.get('star_rating')
                    try: 
                        star = int(star) if star else None
                    except: 
                        star = None
                        
                    ton = data.get('ton')
                    try:
                        ton = float(ton) if ton else None
                    except:
                        ton = None
                    
                    Device.objects.create(
                        name=data.get('device_type') or 'DEVICE', # Use type as name if name missing
                        device_type=data.get('device_type') or 'OTHER',
                        brand=brand_obj,
                        building=building,
                        room=room,
                        quantity=qty,
                        watt_rating=rating,
                        star_rating=star,
                        ton=ton,
                        # Store extra fields in metadata
                        metadata={'hours_used_per_day': hrs}
                    )
                    saved_count += 1
                except Exception as e:
                    errors.append(f"Row {index + 1}: {str(e)}")
        
        return Response({
            'success': True,
            'saved_count': saved_count,
            'errors': errors
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
