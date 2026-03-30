from django.core.management.base import BaseCommand
from energy.device_parser import DeviceSpreadsheetParser
from energy.models import Device, Building, Room, Brand, DeviceCategory
from django.db import transaction
import os

class Command(BaseCommand):
    help = 'Import devices from a spreadsheet using smart AI parsing'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the Excel or CSV file')
        parser.add_argument('--no-llm', action='store_true', help='Disable LLM parsing (use fallback only)')

    def handle(self, *args, **options):
        file_path = options['file_path']
        use_llm = not options['no_llm']

        if not os.path.exists(file_path):
            self.stderr.write(self.style.ERROR(f'File found not found: {file_path}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Starting import from {file_path}...'))
        
        parser = DeviceSpreadsheetParser()
        
        try:
            # Parse the spreadsheet
            devices_data = parser.parse_spreadsheet(file_path, use_llm=use_llm)
            self.stdout.write(f'Parsed {len(devices_data)} devices. Saving to database...')

            created_count = 0
            
            with transaction.atomic():
                for data in devices_data:
                    # Get or create building
                    building_name = data.get('building', 'Default Building')
                    building, _ = Building.objects.get_or_create(name=building_name)

                    # Get or create room
                    room_name = data.get('room', 'Unknown Room')
                    room, _ = Room.objects.get_or_create(name=room_name, building=building)

                    # Create device
                    Device.objects.create(
                        name=data.get('device_type', 'DEVICE'), # Use type as name if name missing
                        device_type=data.get('device_type', 'OTHER'),
                        building=building,
                        room=room,
                        quantity=data.get('quantity', 1),
                        watt_rating=data.get('watt_rating', 0),
                        # Store hours in metadata if model doesn't support it directly yet
                        metadata={'hours_used_per_day': data.get('hours_used_per_day', 0)}
                    )
                    created_count += 1
            
            self.stdout.write(self.style.SUCCESS(f'Successfully imported {created_count} devices!'))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error importing devices: {str(e)}'))
