"""
The background half of "OCR runs in background": every
EMAIL_OCR_INTERVAL_SECONDS (default 3600 = hourly) it runs the same sweep
as the Celery beat task (apps.email_inbox.tasks) — OCR every inbound email
that hasn't been turned into a Document yet.

Exists because production has no Celery worker/beat/Redis: entrypoint.sh
starts this as a background process next to gunicorn in the backend
container, so the schedule ships with the image and needs no extra
service. Safe alongside the admin's "Run OCR job now" — each message is
claimed with an atomic conditional UPDATE (see process_pending_messages),
so two runs can never process the same email twice.

Usage: python manage.py run_email_ocr_scheduler [--once]
Set EMAIL_OCR_INTERVAL_SECONDS=0 to disable it.
"""
import logging
import os
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from apps.email_inbox.processing import process_pending_messages

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run the inbound-email OCR job on a fixed interval (default hourly).'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Run a single sweep and exit.')

    def handle(self, *args, **options):
        interval = int(os.environ.get('EMAIL_OCR_INTERVAL_SECONDS', '3600'))
        if interval <= 0 and not options['once']:
            self.stdout.write('Email OCR scheduler disabled (EMAIL_OCR_INTERVAL_SECONDS=0).')
            return

        while True:
            close_old_connections()
            try:
                counts = process_pending_messages()
                self.stdout.write(f'[email-ocr-scheduler] sweep done: {counts}')
            except Exception:
                # Never let one bad sweep (DB blip, S3 timeout) stop the schedule.
                logger.exception('Email OCR scheduled sweep failed')
            finally:
                close_old_connections()

            if options['once']:
                return
            self.stdout.flush()
            time.sleep(interval)
