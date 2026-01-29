# apps/emissions/views.py
from .services import calculate_emission

energy_kwh, co2 = calculate_emission(
    power_w=appliance.power_rating,
    hours=usage.hours_used,
    factor=0.82  
)
