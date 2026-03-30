import pandas as pd
import re
import logging
from django.db import transaction
from ..models import Building, Room, Device, Brand, DeviceCategory

logger = logging.getLogger(__name__)

class DataWrapper:
    def __init__(self):
        self.buildings = {b.name.lower(): b for b in Building.objects.all()}
        self.categories = {c.name.lower(): c for c in DeviceCategory.objects.all()}
        self.brands = {b.name.lower(): b for b in Brand.objects.all()}
        self.rooms = {(r.building_id, r.name.lower()): r for r in Room.objects.all()}

    def get_or_create_building(self, name):
        name_clean = str(name).strip()
        key = name_clean.lower()
        if key not in self.buildings:
            obj = Building.objects.create(name=name_clean)
            self.buildings[key] = obj
        return self.buildings[key]

    def get_or_create_room(self, building_obj, room_name):
        room_clean = str(room_name).strip()
        key = (building_obj.id, room_clean.lower())
        if key not in self.rooms:
            obj = Room.objects.create(building=building_obj, name=room_clean)
            self.rooms[key] = obj
        return self.rooms[key]

    def get_or_create_brand(self, name):
        if not name or pd.isna(name):
            return None
        name_clean = self.normalize_brand(name)
        if not name_clean:
            return None
        key = name_clean.lower()
        if key not in self.brands:
            obj = Brand.objects.create(name=name_clean)
            self.brands[key] = obj
        return self.brands[key]
    
    def normalize_brand(self, name):
        if not name or pd.isna(name):
            return None

        name_orig = str(name).strip()
        lower = name_orig.lower()

        # Treat obvious empty/zero markers as no-brand
        if lower in ('0', '', 'nan', 'none', 'n/a', 'na'):
            return None

        # Replace separators and normalize whitespace
        lower = re.sub(r'[\-_/,]+', ' ', lower)
        lower = re.sub(r'\s+', ' ', lower).strip()

        # Mapping of canonical brand -> list of matching fragments/typos
        brand_patterns = {
            'Hitachi': [r'hitach', r'hiatchi', r'hitaci'],
            'Mitsubishi': [r'mitsub', r'mitsubi'],
            'Toshiba': [r'toshib', r'toshibha'],
            'Carrier': [r'carrier'],
            'Lloyd': [r'lloyd'],
            'Daikin': [r'daikin'],
            'Midea': [r'midea'],
            'General': [r'\bgen\b', r'general'],
            'Akbhashi': [r'akb', r'akab', r'akbhashi', r'akabishi', r'akbhashi'],
            'Casete': [r'caset', r'cassett', r'casete']
        }

        # Try to find the first matching canonical brand
        for canon, patterns in brand_patterns.items():
            for pat in patterns:
                if re.search(pat, lower):
                    return canon

        # If multiple brands listed, prefer the first token that looks like a brand
        first_token = lower.split()[0]
        if len(first_token) > 1:
            return first_token.title()

        # Fallback: Title-case the original cleaned name
        return name_orig.title()

    def get_or_create_category(self, name):
        name_clean = str(name).strip()
        key = name_clean.lower()
        if key not in self.categories:
            obj = DeviceCategory.objects.create(name=name_clean)
            self.categories[key] = obj
        return self.categories[key]

class DeviceNormalizationService:
    def __init__(self):
        self.data_wrapper = None

    def process_file(self, file_obj):
        file_name = file_obj.name.lower()
        if file_name.endswith('.csv'):
            df = pd.read_csv(file_obj)
        else:
            df = pd.read_excel(file_obj)
        
        df.columns = df.columns.astype(str).str.strip().str.lower()
        self.data_wrapper = DataWrapper()
        
        results = {'processed': 0, 'created': 0, 'errors': []}

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    self.process_row(row)
                    results['processed'] += 1
                    results['created'] += 1
                except Exception as e:
                    results['errors'].append(f"Row {index+2}: {str(e)}")
        
        return results

    def process_row(self, row):
        building_raw = row.get('building')
        room_raw = row.get('room')
        
        if pd.isna(building_raw) or pd.isna(room_raw): return

        building = self.data_wrapper.get_or_create_building(building_raw)
        room = self.data_wrapper.get_or_create_room(building, room_raw)

        column_map = [
            ('lights', 'LIGHT'),
            ('fans', 'FAN'),
            ('cooling', 'AC'),
            ('electronics', 'ELECTRONICS'),
            ('others', 'OTHER'),
        ]

        ac_metadata = {
            'star_rating': self.clean_numeric(row.get('ac star rating')),
            'ton': self.clean_numeric(row.get('ac ton')),
            'iseer': self.clean_numeric(row.get('iseer')),
            'watt': self.clean_numeric(row.get('ac watt'))
        }
        ac_brand_raw = row.get('ac company')
        
        for col_keyword, dev_type in column_map:
            col_name = next((c for c in row.index if col_keyword in c), None)
            if not col_name: continue

            value = row[col_name]
            if pd.isna(value) or str(value).strip() in ['', '-', 'nil', 'na']: continue
            
            items = self.parse_mixed_cell(str(value))
            
            for item_name, quantity in items:
                if quantity == 0: continue

                final_dev_type = dev_type
                final_category_name = col_keyword.title()

                if 'mac' in item_name.lower() or 'cpu' in item_name.lower():
                     final_dev_type = 'PC'
                elif 'projector' in item_name.lower():
                     final_dev_type = 'ELECTRONICS'
                
                brand = None
                if final_dev_type == 'AC' and ac_brand_raw:
                     brand = self.data_wrapper.get_or_create_brand(ac_brand_raw)
                
                category = self.data_wrapper.get_or_create_category(final_category_name)
                
                watt = 0
                if final_dev_type == 'AC' and ac_metadata['watt']:
                    watt = ac_metadata['watt']
                
                Device.objects.create(
                    name=item_name,
                    device_type=final_dev_type,
                    category=category,
                    brand=brand,
                    building=building,
                    room=room,
                    quantity=quantity,
                    watt_rating=watt,
                    star_rating=ac_metadata['star_rating'] if final_dev_type == 'AC' else None,
                    ton=ac_metadata['ton'] if final_dev_type == 'AC' else None,
                    iseer=ac_metadata['iseer'] if final_dev_type == 'AC' else None
                )

    def parse_mixed_cell(self, cell_value):
        parts = re.split(r'[/,]', cell_value.lower())
        results = []
        for part in parts:
            part = part.strip()
            if not part: continue
            qty_match = re.search(r'(\d+)', part)
            if qty_match:
                qty = int(qty_match.group(1))
                name = re.sub(r'\d+', '', part).strip().replace('nos', '').replace('.', '').strip()
                if not name: name = "Standard"
                results.append((name.title(), qty))
            elif part not in ['-', 'nil', 'na']:
                results.append((part.title(), 1))
        return results

    def clean_numeric(self, value):
        if pd.isna(value): return None
        try: return float(str(value).replace(',', ''))
        except: return None
