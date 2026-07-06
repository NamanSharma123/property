# Properly Backend — Django REST Framework

Django REST Framework port of the Node/Express backend in `../backend`. It is a
drop-in replacement: same PostgreSQL schema, same endpoints, same JSON
request/response shapes, and compatible auth — existing Argon2 password hashes
and refresh tokens in the database keep working, and access tokens use the same
JWT format (`{userId}` signed with `JWT_SECRET`).

## Setup

```powershell
cd backend-django
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
```

`.env` uses the same variables as the Node backend (`DATABASE_URL`,
`JWT_SECRET`, `NODE_ENV`). Set `DB_SSL=false` if you use a local Postgres
without SSL (Supabase needs it on).

## Database

**Existing database (already created by the Node backend):** the tables are
already there, so just record the migrations as applied — don't let Django
recreate anything:

```powershell
python manage.py migrate contenttypes
python manage.py migrate api --fake
```

**Fresh database:** let Django create everything, then seed the default
system categories:

```powershell
python manage.py migrate
python manage.py seed_categories
```

## Run

```powershell
python manage.py runserver 5000
```

The API is served at `http://localhost:5000/api` with a health check at
`/health`, matching the Node server.

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

## OCR notes

- PDF text extraction uses `pypdf` (equivalent of `pdf-parse`).
- Image OCR uses `pytesseract`, which needs the **Tesseract binary**
  installed and on your `PATH`. On Windows install it from
  https://github.com/UB-Mannheim/tesseract/wiki. PDF extraction works without it.

## Layout

```
properly/            Django project (settings, urls)
api/
  models.py          All tables, mapped 1:1 to the existing schema
  authentication.py  JWT auth (port of authMiddleware.protect)
  exceptions.py      Node-style {"success": false, "error": ...} responses
  ocr_parser.py      Port of the "OCR PARSER v5.0" regex parser
  views/             One module per Express controller
  management/commands/seed_categories.py
```
