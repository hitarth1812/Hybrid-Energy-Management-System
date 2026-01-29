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


