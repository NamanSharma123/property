#!/bin/sh
# App Runner has no separate "run a one-off task" step like ECS does, so
# migrations have to run somewhere in the normal deploy path — here, right
# before gunicorn starts on every container boot. `migrate` is idempotent
# (a no-op when there's nothing new to apply), so this is safe to run on
# every deploy, including ones with no schema changes at all.
set -e

python manage.py migrate --noinput

# Idempotent backfill for users that predate the Mailbox model (only
# creates a row for users that don't have one yet) — same "safe on every
# deploy" reasoning as migrate above.
python manage.py backfill_mailboxes

# Idempotent: moves any user still on a stale INBOUND_EMAIL_DOMAIN (e.g. a
# leftover placeholder address from before the real domain was
# provisioned) onto the currently configured one. A no-op once everyone's
# already on the current domain.
python manage.py migrate_stale_inbound_emails

# "OCR runs in background": hourly sweep over new inbound emails. There's no
# Celery worker/beat in production, so it runs as a background process in
# this container (see apps/email_inbox/management/commands/
# run_email_ocr_scheduler.py). Its failures are logged, never fatal to
# gunicorn; EMAIL_OCR_INTERVAL_SECONDS=0 turns it off.
python -u manage.py run_email_ocr_scheduler &

exec gunicorn config.wsgi:application --bind 0.0.0.0:5000 --workers 4 --timeout 60
