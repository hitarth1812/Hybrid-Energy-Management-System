from django.db import models
#devices
class Device(models.Model):
    DEVICE_TYPES = [
        ('FAN', 'Fan'),
        ('AC', 'Air Conditioner'),
        ('LIGHT', 'Light'),
        ('PC', 'Computer'),
        ('OTHER', 'Other'),
    ]

    building = models.CharField(max_length=100)
    room = models.CharField(max_length=50)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    quantity = models.IntegerField()
    watt_rating = models.FloatField()
    hours_used_per_day = models.FloatField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.device_type} - {self.room}"
    
class Appliance(models.Model):
    name = models.CharField(max_length=50)
    power_rating = models.FloatField(help_text="Watts")
    category = models.CharField(max_length=20)

class Usage(models.Model):
    appliance = models.ForeignKey(Appliance, on_delete=models.CASCADE)
    hours_used = models.FloatField()
    date = models.DateField()
    season = models.CharField(max_length=10)

class Emission(models.Model):
    usage = models.OneToOneField(Usage, on_delete=models.CASCADE)
    energy_kwh = models.FloatField()
    co2_kg = models.FloatField()

# models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class EnergyUsage(models.Model):
    device = models.ForeignKey(
        'Device',
        on_delete=models.CASCADE,
        related_name='energy_usages'
    )

    date = models.DateField()
    hours_used = models.DecimalField(
        max_digits=4,
        decimal_places=2
    )

    energy_consumed = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        editable=False
    )

    def clean(self):
        # 1. Hours validation
        if self.hours_used < 0 or self.hours_used > 24:
            raise ValidationError(
                {"hours_used": "Hours used must be between 0 and 24."}
            )

        # 2. Future date check
        if self.date > timezone.now().date():
            raise ValidationError(
                {"date": "Energy usage date cannot be in the future."}
            )

        # 3. Device power validation
        if self.device.power_rating <= 0:
            raise ValidationError(
                "Device power rating must be greater than zero."
            )

    def save(self, *args, **kwargs):
        # Auto-calculate energy consumption
        self.energy_consumed = (
            self.device.power_rating * self.hours_used
        ) / 1000  # Wh → kWh

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.device} | {self.date}"


