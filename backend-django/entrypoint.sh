#!/bin/sh
# App Runner has no separate "run a one-off task" step like ECS does, so
# migrations have to run somewhere in the normal deploy path — here, right
# before gunicorn starts on every container boot. `migrate` is idempotent
# (a no-op when there's nothing new to apply), so this is safe to run on
# every deploy, including ones with no schema changes at all.
set -e

python manage.py migrate --noinput

exec gunicorn config.wsgi:application --bind 0.0.0.0:5000 --workers 4 --timeout 60
