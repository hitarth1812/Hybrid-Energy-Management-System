from django.contrib import admin

from .models import Device

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = (
        'building',
        'room',
        'device_type',
        'quantity',
        'watt_rating',
        'hours_used_per_day',
        'created_at'
    )

def save(self, *args, **kwargs):
    self.full_clean()   # 🔥 forces validation everywhere
    self.energy_consumed = (
        self.device.power_rating * self.hours_used
    ) / 1000
    super().save(*args, **kwargs)

