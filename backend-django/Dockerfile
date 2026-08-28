FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# Tesseract is needed for image OCR (/api/ocr/extract with images)
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/prod.txt

COPY . .

# collectstatic only needs SECRET_KEY to be present, not the real value — the
# actual runtime secret is injected by App Runner as an env var and overrides
# this at container start.
RUN DJANGO_SECRET_KEY=build-time-placeholder python manage.py collectstatic --noinput

RUN chmod +x entrypoint.sh

EXPOSE 5000

# entrypoint.sh runs `migrate` (idempotent) before starting gunicorn —
# App Runner has no separate one-off-task step, so this is what keeps the
# production schema in sync on every deploy without a manual migrate step.
# --timeout 60: Neon's free tier suspends the DB compute when idle, and the
# first request after a while can take ~30s to wake it back up — the default
# gunicorn timeout (30s) killed that request right as it was about to
# succeed. 60s gives headroom without masking a genuinely hung request.
CMD ["./entrypoint.sh"]
