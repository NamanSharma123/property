"""
One-off (but safe-to-rerun) migration: regenerates inbound_email + Mailbox
for any user still on a domain other than the currently configured
INBOUND_EMAIL_DOMAIN. Covers accounts created before the domain was set
to its real, SES-provisioned value (e.g. leftover 'properlymail.com.au'
placeholder addresses that were never actually receivable) — moving them
to a real, working alias under the current domain, same generation logic
as signup (phone-based, falling back to a UUID-derived address, with a
collision retry).

Usage: python manage.py migrate_stale_inbound_emails
"""
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.accounts.inbound_email import generate_inbound_email
from apps.accounts.models import Mailbox, User


class Command(BaseCommand):
    help = "Regenerate inbound_email/Mailbox for users stuck on a stale INBOUND_EMAIL_DOMAIN."

    def handle(self, *args, **options):
        domain_suffix = f'@{settings.INBOUND_EMAIL_DOMAIN}'
        stale_users = User.objects.filter(
            inbound_email__isnull=False
        ).exclude(inbound_email='').exclude(inbound_email__iendswith=domain_suffix)

        count = 0
        for user in stale_users:
            old_address = user.inbound_email
            new_address = generate_inbound_email(phone=user.phone, user_id=user.id)
            if User.objects.filter(inbound_email=new_address).exclude(id=user.id).exists():
                new_address = generate_inbound_email(user_id=user.id)

            user.inbound_email = new_address
            user.save(update_fields=['inbound_email'])

            # Keyed on user (not email_address, which is unique) so this
            # updates the user's existing Mailbox row in place rather than
            # risking a unique-constraint clash while transitioning it.
            Mailbox.objects.update_or_create(
                user=user,
                defaults={'email_address': new_address, 'alias': new_address.split('@', 1)[0], 'status': 'active'},
            )

            self.stdout.write(f'{user.email}: {old_address} -> {new_address}')
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Migrated {count} user(s) to {settings.INBOUND_EMAIL_DOMAIN}.'))
