from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = False

SECRET_KEY = config('DJANGO_SECRET_KEY')  # required in production

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
