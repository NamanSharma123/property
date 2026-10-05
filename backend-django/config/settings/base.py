"""
Base settings for the Properly backend (Django REST Framework port of the
original Express backend). Environment is read from .env via python-decouple.
"""
from pathlib import Path

import dj_database_url
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-change-me')

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*', cast=lambda v: [s.strip() for s in v.split(',')])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    # Third-party
    'corsheaders',
    'rest_framework',
    'django_filters',
    'django_celery_beat',
    # Domain apps
    'apps.common',
    'apps.accounts',
    'apps.properties',
    'apps.tenants',
    'apps.transactions',
    'apps.expenses',
    'apps.categories',
    'apps.notifications',
    'apps.ocr',
    'apps.depreciation',
    'apps.loans',
    'apps.email_inbox',
    'apps.support',
    'apps.subscriptions',
    'apps.admin_panel',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database — same DATABASE_URL env var as the Node backend (Supabase Postgres, SSL required)
DATABASES = {
    'default': dj_database_url.parse(
        config('DATABASE_URL', default='postgres://postgres:postgres@localhost:5432/properly'),
        conn_max_age=600,
        ssl_require=config('DB_SSL', default=True, cast=bool),
    )
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model mapped onto the existing `users` table
AUTH_USER_MODEL = 'accounts.User'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = config('TIME_ZONE', default='Asia/Kolkata')
USE_I18N = False
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# CORS — allow only configured browser origins in production.
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default=(
        'https://investview.com.au,https://www.investview.com.au,'
        'https://5yy6ei9nup.ap-southeast-2.awsapprunner.com'
    ),
    cast=lambda v: [origin.strip() for origin in v.split(',') if origin.strip()],
)
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
CORS_ALLOW_HEADERS = ['content-type', 'authorization']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'EXCEPTION_HANDLER': 'apps.common.exceptions.exception_handler',
    'UNAUTHENTICATED_USER': None,
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024  # 20MB (OCR file uploads)
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

# JWT / session config (mirrors backend/src/config/index.js — kept compatible
# with tokens issued by the Node backend)
JWT_SECRET = config('JWT_SECRET', default='fallback-secret-key')
JWT_EXPIRES_IN_MINUTES = config('JWT_EXPIRES_IN_MINUTES', default=15, cast=int)
SESSION_REFRESH_DAYS = 30

# Password policy (mirrors backend/src/config/index.js)
PASSWORD_POLICY = {
    'min_length': 8,
    'require_uppercase': True,
    'require_lowercase': True,
    'require_numbers': True,
    'require_special_chars': True,
}

# Celery (Redis broker; django-celery-beat for schedules)
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_TASK_ALWAYS_EAGER = False

# Unique Email ID OCR spec point 5: "job from behind can run may be every
# hour". Inert until an actual Celery worker + beat process is deployed
# against a real broker (not provisioned yet — see AWS_DEPLOYMENT.md) —
# until then, apps.admin_panel.views_email.AdminEmailRunJobView's "run now"
# button does the same work synchronously, on demand.
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    'process-inbound-emails-hourly': {
        'task': 'apps.email_inbox.tasks.process_pending_email_messages',
        'schedule': crontab(minute=0),
    },
}

# Document storage (uploaded statements/receipts attached to transactions) —
# S3, since App Runner has no persistent disk across deploys/restarts.
DOCUMENTS_S3_BUCKET = config('DOCUMENTS_S3_BUCKET', default='')
DOCUMENTS_S3_REGION = config('DOCUMENTS_S3_REGION', default='ap-southeast-2')

# Frontend base URL — used to build links inside emails (password reset, etc.)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Domain used to build each user's permanent inbound OCR-ingestion email
# address (User.inbound_email). This only names the address — actually
# receiving mail sent to it requires provisioning real AWS SES inbound
# receipt rules + this domain's MX records, which is a later phase.
INBOUND_EMAIL_DOMAIN = config('INBOUND_EMAIL_DOMAIN', default='properlymail.com.au')

# Shared-secret gate on POST /api/email/inbound (apps.email_inbox) — for
# manual/test calls only. Empty by default so the endpoint is closed
# (rejects everything) until a secret is explicitly configured.
INBOUND_EMAIL_WEBHOOK_SECRET = config('INBOUND_EMAIL_WEBHOOK_SECRET', default='')

# The real SES/SNS inbound path (apps.email_inbox.ses_adapter), auth'd by
# SNS message-signature verification instead of a shared secret. SES email
# RECEIVING is only available in a handful of AWS regions (us-east-1,
# us-west-2, eu-west-1 as of writing) — not necessarily the region the app
# itself runs in — so the S3 bucket SES delivers raw mail into typically
# lives in a different region than DOCUMENTS_S3_BUCKET.
SES_INBOUND_S3_BUCKET = config('SES_INBOUND_S3_BUCKET', default='')
SES_INBOUND_S3_REGION = config('SES_INBOUND_S3_REGION', default='us-east-1')
# Optional extra allowlist check alongside signature verification — reject
# a (validly-signed) notification from any topic other than this one, once
# you know the real topic's ARN. Empty means "don't check" (signature
# verification alone still gates the endpoint).
SES_INBOUND_SNS_TOPIC_ARN = config('SES_INBOUND_SNS_TOPIC_ARN', default='')

# Email (password reset). Falls back to Django's console backend (prints to
# stdout instead of sending) when no SMTP password is configured, so local
# dev works without needing real credentials.
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default=f'Properly <{EMAIL_HOST_USER}>')

if EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = True
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
