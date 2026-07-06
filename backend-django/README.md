# Properly Backend — Django REST Framework

Django REST Framework port of the Node/Express backend in `../backend`. It is a
drop-in replacement: same PostgreSQL schema, same endpoints, same JSON
request/response shapes, and compatible auth — existing Argon2 password hashes
and refresh tokens in the database keep working, and access tokens use the same
JWT format (`{userId}` signed with `JWT_SECRET`).

## Folder structure

```
backend-django/
├── manage.py
├── pyproject.toml
├── Dockerfile
├── .env / .env.example
│
├── requirements/
│   ├── base.txt               # Django 5, DRF, cors-headers, django-filter, psycopg2,
│   │                          # PyJWT, argon2, pypdf, pytesseract, celery, redis, celery-beat
│   ├── dev.txt
│   └── prod.txt               # + gunicorn, uvicorn
│
├── config/                    # Project config (settings module = config.settings.*)
│   ├── settings/
│   │   ├── base.py            # INSTALLED_APPS, AUTH_USER_MODEL = "accounts.User"
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py                # Root routing — /admin/, /health, everything else under /api/
│   ├── celery.py              # Celery app (Redis broker, celery-beat for schedules)
│   ├── asgi.py
│   └── wsgi.py
│
└── apps/                      # All domain apps live under the "apps" package
    ├── common/                # Shared infra — NO models of its own to migrate
    │   ├── models.py          # Abstract base models (UUID pk + timestamps)
    │   ├── pagination.py      # Shared pagination helpers
    │   ├── permissions.py     # Shared role-based permission classes (restrict_to)
    │   ├── exceptions.py      # Node-style {"success": false, "error": ...} responses
    │   ├── security.py        # Node-compatible argon2 password hashing
    │   ├── utils.py           # Row serialization, activity logging
    │   ├── views.py           # ProtectedView / PublicView base classes
    │   └── management/commands/seed.py   # Default system categories
    │
    ├── accounts/              # Custom User model (users/sessions/activity_logs) + JWT auth
    │   ├── models.py, managers.py, serializers.py, views.py, urls.py, admin.py
    │   ├── authentication.py  # Port of the Express `protect` middleware
    │   └── migrations/
    ├── properties/
    ├── tenants/
    ├── transactions/
    ├── expenses/
    ├── categories/
    ├── notifications/         # + signals.py (welcome notification on user creation)
    └── ocr/                   # Documents, extraction + parser.py (OCR PARSER v5.0 port)
```

Every domain app follows the same per-app pattern: `models.py`,
`serializers.py`, `views.py`, `urls.py`, `admin.py`, `migrations/`.

## Setup

```powershell
cd backend-django
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements/dev.txt
copy .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
```

## Database

**Existing database (already created by the Node backend):** the domain tables
are already there, so record their migrations as applied without touching
them, then let Django create only its own infra tables (admin, auth, sessions,
content types, celery-beat):

```powershell
python manage.py migrate accounts --fake
python manage.py migrate properties --fake
python manage.py migrate categories --fake
python manage.py migrate tenants --fake
python manage.py migrate ocr --fake
python manage.py migrate transactions --fake
python manage.py migrate expenses --fake
python manage.py migrate notifications --fake
python manage.py migrate
```

**Fresh database:** let Django create everything, then seed the default
system categories:

```powershell
python manage.py migrate
python manage.py seed
```

## Run

```powershell
python manage.py runserver 5000
```

- API at `http://localhost:5000/api` (same routes as the Node server)
- Health check at `/health`
- Django admin at `/admin/` — create an admin with
  `python manage.py createsuperuser`, or log in with any existing user whose
  `role` is `admin` (argon2 hashes from the Node backend verify as-is)

Production: `docker build .` (gunicorn on port 5000), or
`gunicorn config.wsgi:application` with `DJANGO_SETTINGS_MODULE=config.settings.prod`.

## Endpoints

Same routes as the Express app:

- `POST /api/auth/signup|login|logout|refresh|verify-password`,
  `GET /api/auth/me|sessions`, `PUT /api/auth/profile|password`,
  `DELETE /api/auth/sessions[/:id]|account`
- `GET|POST /api/properties`, `GET /api/properties/stats`,
  `GET|PUT|DELETE /api/properties/:id`
- `GET|POST /api/transactions`, `GET /api/transactions/stats|monthly`,
  `GET|PUT|DELETE /api/transactions/:id`
- `GET|POST /api/tenants`, `GET /api/tenants/stats`, `GET|PUT|DELETE /api/tenants/:id`
- `GET|POST /api/expenses`, `GET /api/expenses/stats`, `GET|PUT|DELETE /api/expenses/:id`
- `GET|POST /api/categories`, `PUT|DELETE /api/categories/:id`
- `GET /api/notifications`, `PUT /api/notifications/read-all|:id/read`,
  `DELETE /api/notifications/:id`
- `POST /api/ocr/extract|extract-pdf|upload|process|convert-to-transactions`,
  `GET /api/ocr/documents|document/:id`, `PUT /api/ocr/correct/:id`,
  `DELETE /api/ocr/document/:id`

Note: auth stays on the Node-compatible custom JWT endpoints
(`/api/auth/login` + `/api/auth/refresh` with the sessions table) rather than
SimpleJWT's `/api/auth/token/`, so existing frontend clients and issued tokens
keep working unchanged.

## OCR notes

- PDF text extraction uses `pypdf` (equivalent of `pdf-parse`).
- Image OCR uses `pytesseract`, which needs the **Tesseract binary**
  installed and on your `PATH`. On Windows install it from
  https://github.com/UB-Mannheim/tesseract/wiki (the Dockerfile installs it
  automatically). PDF extraction works without it.

## Celery

`config/celery.py` wires a Celery app with a Redis broker and
django-celery-beat for schedules. Nothing in the API requires a worker — start
one only if you add async/scheduled tasks:

```powershell
celery -A config worker -l info
celery -A config beat -l info
```
