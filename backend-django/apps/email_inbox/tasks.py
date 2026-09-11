"""
The periodic half of the "OCR job runs every periodic time" spec
requirement — registered hourly in CELERY_BEAT_SCHEDULE (see
config/settings/base.py). Requires an actual Celery worker + beat process
to be deployed and pointed at a Redis broker; until then this task simply
never fires on its own — see AdminEmailRunJobView for the on-demand
equivalent that works today without one.
"""
from celery import shared_task

from .processing import process_pending_messages


@shared_task(name='apps.email_inbox.tasks.process_pending_email_messages')
def process_pending_email_messages():
    return process_pending_messages()
