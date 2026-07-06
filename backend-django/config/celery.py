"""
Celery app (Redis broker, django-celery-beat for schedules).
Only needed if you use scheduled/async features — the API works without a
running worker.
"""
import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

app = Celery('properly')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
