from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Building(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Room(models.Model):
    name = models.CharField(max_length=50, db_index=True)
    building = models.ForeignKey(Building, related_name='rooms', on_delete=models.CASCADE)
    floor = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['building', 'name']
        unique_together = ['building', 'name']

    def __str__(self):
        return f'{self.building.name} - {self.name}'

class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class DeviceCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Device Categories'

    def __str__(self):
        return self.name

class Device(models.Model):
    # Removed strict choices to allow flexible user input
    # DeviceType logic is now handled loosely or via frontend conventions
    name = models.CharField(max_length=100, blank=True)
    
    # Changed from choices to plain CharField to allow custom types
    device_type = models.CharField(max_length=50, db_index=True) 
    
    category = models.ForeignKey(DeviceCategory, related_name='devices', on_delete=models.PROTECT, null=True, blank=True)
    brand = models.ForeignKey(Brand, related_name='devices', on_delete=models.SET_NULL, null=True, blank=True)
    building = models.ForeignKey(Building, related_name='devices', on_delete=models.CASCADE)
    room = models.ForeignKey(Room, related_name='devices', on_delete=models.CASCADE)
    
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    watt_rating = models.FloatField(default=0, validators=[MinValueValidator(0)])
    
    # AC Specifics (Optional for other types)
    star_rating = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    ton = models.FloatField(null=True, blank=True)
    iseer = models.FloatField(null=True, blank=True)
    
    # Flexible Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['device_type', 'building', 'room']),
            models.Index(fields=['brand']),
        ]

    def __str__(self):
        return f'{self.device_type} in {self.room}'


# Carbon Intelligence Platform Models

EMISSION_FACTOR = 0.82  # India grid kg CO₂ per kWh

class UsageLog(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='usage_logs')
    date = models.DateField()
    hours_used = models.FloatField()
    energy_kwh = models.FloatField(blank=True, null=True)
    carbon_kg = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Calculate energy and carbon before saving
        # energy (kWh) = (watt * quantity * hours) / 1000
        energy = (self.device.watt_rating * self.device.quantity * self.hours_used) / 1000
        self.energy_kwh = round(energy, 4)
        self.carbon_kg = round(energy * EMISSION_FACTOR, 4)
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('device', 'date')
        ordering = ['-date']

class CarbonTarget(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='carbon_targets')
    month = models.IntegerField()
    year = models.IntegerField()
    target_kg = models.FloatField()
    
    class Meta:
        unique_together = ('building', 'month', 'year')

class ESGReport(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='esg_reports')
    month = models.IntegerField()
    year = models.IntegerField()
    total_energy_kwh = models.FloatField()
    total_carbon_kg = models.FloatField()
    target_kg = models.FloatField(null=True, blank=True)
    pdf_file = models.FileField(upload_to='esg_reports/', null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('building', 'month', 'year')

