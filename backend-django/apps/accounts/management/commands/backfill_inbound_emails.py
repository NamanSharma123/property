"""
One-off backfill for existing users created before `inbound_email` existed.
New signups get one automatically (see SignupView); this only needs to run
once against a database that has pre-existing users.

Usage: python manage.py backfill_inbound_emails
"""
from django.core.management.base import BaseCommand

from apps.accounts.inbound_email import generate_inbound_email
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Backfill User.inbound_email for users that don't have one yet."

    def handle(self, *args, **options):
        users = User.objects.filter(inbound_email__isnull=True)
        count = 0
        for user in users:
            user.inbound_email = generate_inbound_email(user.id)
            user.save(update_fields=['inbound_email'])
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Backfilled inbound_email for {count} user(s).'))
