from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings

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
# [L1] EMISSION_FACTOR now lives in settings.py; this module reads it from there.

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
        # [L1] Use settings.EMISSION_FACTOR as the single source of truth
        emission_factor = getattr(settings, 'EMISSION_FACTOR', 0.82)
        energy = (self.device.watt_rating * self.device.quantity * self.hours_used) / 1000
        self.energy_kwh = round(energy, 4)
        self.carbon_kg = round(energy * emission_factor, 4)
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('device', 'date')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['device', 'date']),
            models.Index(fields=['date']),
        ]

class CarbonTarget(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='carbon_targets')
    month = models.IntegerField()
    year = models.IntegerField()
    target_kg = models.FloatField()
    
    class Meta:
        unique_together = ('building', 'month', 'year')

class ESGReport(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('error', 'Error'),
    ]
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='esg_reports')
    month = models.IntegerField()
    year = models.IntegerField()
    total_energy_kwh = models.FloatField(default=0)
    total_carbon_kg = models.FloatField(default=0)
    target_kg = models.FloatField(null=True, blank=True)
    pdf_file = models.FileField(upload_to='esg_reports/', null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    celery_task_id = models.CharField(max_length=64, null=True, blank=True)
    error_message = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('building', 'month', 'year')


class PredictionLog(models.Model):
    """
    Real-time ML Model Monitoring 
    Captures live predictions to compare against ground truth later.
    """
    timestamp = models.DateTimeField(db_index=True)
    
    # Model Predictions
    predicted_power_kw = models.FloatField()
    p10_kw = models.FloatField(null=True, blank=True)
    p90_kw = models.FloatField(null=True, blank=True)
    
    # Store dynamic features that shift over time to calculate PSI drift
    features_snapshot = models.JSONField(default=dict)
    
    # Ground Truth Analytics (Updated asynchronously via telemetry/cron)
    target_actual_kw = models.FloatField(null=True, blank=True)
    residual_kw = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Prediction {self.predicted_power_kw}kW at {self.timestamp}"


class MLSystemEvent(models.Model):
    """
    System flags generated by the monitor_drift cron tasks.
    Used for triggering alerts or automated retraining.
    """
    SEVERITY_CHOICES = [
        ('INFO', 'Info'),
        ('WARN', 'Warning'),
        ('ERROR', 'Error - Action Required'),
    ]
    
    event_type = models.CharField(max_length=100) # e.g., "PERFORMANCE_DEGRADATION", "FEATURE_DRIFT"
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='INFO')
    description = models.TextField()
    metrics = models.JSONField(default=dict) # e.g., {"mae": 0.35, "baseline_mae": 0.20}
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.severity} - {self.event_type} at {self.created_at}"


class PredictionResult(models.Model):
    report        = models.OneToOneField(ESGReport, on_delete=models.CASCADE)
    model_version = models.CharField(max_length=64)
    predicted_at  = models.DateTimeField(auto_now_add=True)
    confidence    = models.FloatField()  # 0.0 - 1.0
    is_fallback   = models.BooleanField(default=False)
    result_json   = models.JSONField()   # Full per-device forecast payload

class OutputLog(models.Model):
    device        = models.ForeignKey(Device, on_delete=models.CASCADE)
    timestamp     = models.DateTimeField()
    output_value  = models.FloatField()   # Units depend on device type
    output_unit   = models.CharField(max_length=32)

class CarbonEmissionLog(models.Model):
    usage_log       = models.OneToOneField(UsageLog, on_delete=models.CASCADE)
    scope           = models.CharField(max_length=8, choices=[('scope1','Scope 1'),('scope2','Scope 2')])
    emission_factor = models.FloatField()   # kg CO2 per kWh
    carbon_kg       = models.FloatField()
