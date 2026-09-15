"""
One-off backfill: creates a Mailbox row for every existing User that
already has an inbound_email but no Mailbox yet (everyone who signed up
before the Mailbox model existed). New signups get one automatically (see
SignupView).

Usage: python manage.py backfill_mailboxes
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import Mailbox, User


class Command(BaseCommand):
    help = "Backfill Mailbox rows for users with an inbound_email but no Mailbox."

    def handle(self, *args, **options):
        users = User.objects.filter(
            inbound_email__isnull=False, mailbox__isnull=True
        ).exclude(inbound_email='')
        count = 0
        for user in users:
            Mailbox.objects.create(
                user=user,
                email_address=user.inbound_email,
                alias=user.inbound_email.split('@', 1)[0],
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Created {count} Mailbox row(s).'))
