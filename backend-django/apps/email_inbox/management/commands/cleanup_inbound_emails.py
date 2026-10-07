"""
Deletes the raw source email from the SES inbound bucket for every
rejected/failed email (see apps.email_inbox.cleanup). Safe to rerun.

Usage:
  python manage.py cleanup_inbound_emails --dry-run
  python manage.py cleanup_inbound_emails --min-size-mb 5
"""
from django.core.management.base import BaseCommand

from apps.email_inbox.cleanup import cleanup_server_emails


class Command(BaseCommand):
    help = 'Delete raw rejected/failed emails (optionally only large ones) from the SES inbound bucket.'

    def add_arguments(self, parser):
        parser.add_argument('--min-size-mb', type=float, default=0, help='Only delete emails at least this large.')
        parser.add_argument('--dry-run', action='store_true', help='Report what would be deleted without deleting.')

    def handle(self, *args, **options):
        result = cleanup_server_emails(
            min_size_bytes=int(options['min_size_mb'] * 1024 * 1024), dry_run=options['dry_run'],
        )
        verb = 'Would delete' if result['dry_run'] else 'Deleted'
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {result['deleted']} email(s), {result['freed_bytes'] / 1024 / 1024:.2f} MB; "
            f"{result['skipped_small']} below size threshold; {result['errors']} error(s)."
        ))
