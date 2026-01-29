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

