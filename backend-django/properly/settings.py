"""
Django settings for the Properly backend (Django REST Framework port of the
original Express backend). Configuration values mirror backend/src/config.
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the project root (same convention as the Node backend)
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-change-me')

DEBUG = os.environ.get('NODE_ENV', 'development') != 'production'

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.postgres',
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'properly.urls'

TEMPLATES = []

WSGI_APPLICATION = 'properly.wsgi.application'

# Database — same DATABASE_URL env var as the Node backend (Supabase Postgres, SSL required)
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/properly'),
        conn_max_age=600,
        ssl_require=os.environ.get('DB_SSL', 'true').lower() == 'true',
    )
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = False
USE_TZ = True

# CORS — the Node backend effectively reflects any origin and allows credentials
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [r'.*']
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
CORS_ALLOW_HEADERS = ['content-type', 'authorization']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'EXCEPTION_HANDLER': 'api.exceptions.exception_handler',
    'UNAUTHENTICATED_USER': None,
    # Match Express body size limit (10mb)
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024  # 20MB (OCR file uploads)
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

# JWT / session config (mirrors backend/src/config/index.js)
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-key')
JWT_EXPIRES_IN_MINUTES = int(os.environ.get('JWT_EXPIRES_IN_MINUTES', '15'))
SESSION_REFRESH_DAYS = 30

# Password policy (mirrors backend/src/config/index.js)
PASSWORD_POLICY = {
    'min_length': 8,
    'require_uppercase': True,
    'require_lowercase': True,
    'require_numbers': True,
    'require_special_chars': True,
}
