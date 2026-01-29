import pandas as pd
from .models import Device

def upload_devices(file_path):
    df = pd.read_csv(file_path)

    for _, row in df.iterrows():
        Device.objects.create(
            building=row['building'],
            room=row['room'],
            device_type=row['device_type'],
            quantity=row['quantity'],
            watt_rating=row['watt_rating'],
            hours_used_per_day=row['hours_used_per_day']
        )

from .services import calculate_emission

energy_kwh, co2 = calculate_emission(
    power_w=appliance.power_rating,
    hours=usage.hours_used,
    factor=0.82  # example emission factor
)


