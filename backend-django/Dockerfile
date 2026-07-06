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

RUN python manage.py collectstatic --noinput

EXPOSE 5000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:5000", "--workers", "4"]
