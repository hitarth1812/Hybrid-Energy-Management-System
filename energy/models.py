from django.db import models

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
