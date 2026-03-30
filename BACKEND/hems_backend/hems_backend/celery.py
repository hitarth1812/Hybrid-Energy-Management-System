"""
[C2] Celery application entry-point for HEMS.

Broker : Redis (redis://localhost:6379/0 by default — set CELERY_BROKER_URL in .env)
Backend: django-celery-results (stores task state in the DB — no separate Redis key needed)

Starting the worker (dev):
    celery -A hems_backend worker -l info

Starting the worker (production):
    celery -A hems_backend worker -l info -c 4 --without-gossip --without-mingle
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hems_backend.settings')

app = Celery('hems_backend')

# Read the CELERY_* namespace from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in every INSTALLED_APPS/<app>/tasks.py
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
