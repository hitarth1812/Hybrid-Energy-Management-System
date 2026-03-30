# [C2] Make the Celery app available as hems_backend.celery_app
# so `from hems_backend.celery import app` works from any module.
from .celery import app as celery_app

__all__ = ('celery_app',)
