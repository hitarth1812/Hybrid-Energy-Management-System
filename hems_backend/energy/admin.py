from django.contrib import admin
from .models import Device, Building, Room, Brand, DeviceCategory

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('device_type', 'building', 'room', 'brand', 'quantity', 'watt_rating')
    list_filter = ('device_type', 'building', 'brand')
    search_fields = ('building__name', 'room__name', 'brand__name')

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'building', 'floor')
    list_filter = ('building',)

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(DeviceCategory)
class DeviceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
