# Properly — Property Management System

A property/tenant/transaction management app: Next.js frontend, Django REST
Framework backend, PostgreSQL (Neon) database.

## Active stack

```
frontend/         Next.js 15 (App Router) — the UI, port 3000
backend-django/   Django REST Framework — the API, port 5000   ← ACTIVE BACKEND
backend/          Node/Express — original implementation, kept for reference ← LEGACY, not run
```

`backend-django` is a line-for-line port of `backend`: same PostgreSQL schema,
same `/api/*` routes, same JSON shapes, same JWT format and Argon2 password
hashing. The frontend was written against the Node API and needs **zero code
changes** to run against Django — it just points at `http://localhost:5000`
either way. `backend/` (Node) is not deployed or run day-to-day; it's kept
around as the original reference implementation. See
[backend-django/README.md](backend-django/README.md) for why/how it was
ported and its internal structure.

## Request flow

```
Browser (localhost:3000)
   │  fetch() calls in frontend/lib/api.ts
   ▼
Next.js app (frontend/)
   │  HTTP → http://localhost:5000/api/...
   ▼
Django (backend-django/) — apps/{accounts,properties,tenants,transactions,
        expenses,categories,notifications,ocr}
   │  psycopg2 / Django ORM
   ▼
PostgreSQL on Neon (ap-southeast-1 / Singapore)
```

Auth: login/signup issue a short-lived JWT access token (kept in memory on
the client) and a long-lived opaque refresh token (in `localStorage`, backed
by a `sessions` table row). Every subsequent request sends
`Authorization: Bearer <accessToken>`; when it expires, `frontend/lib/api.ts`
transparently calls `/api/auth/refresh` and retries once.

## Running everything locally

```powershell
# Backend
cd backend-django
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements/dev.txt
copy .env.example .env      # fill in DATABASE_URL (Neon) and JWT_SECRET
python manage.py migrate
python manage.py seed        # only needed once, on a fresh database
python manage.py runserver 5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

Full backend details (folder layout, migration strategy, OCR/Celery notes):
[backend-django/README.md](backend-django/README.md).
Frontend details (structure, env vars, known rough edges):
[frontend/README.md](frontend/README.md).

## Production deployment (AWS)

This app is live in production on AWS via automatic CI/CD — push to `main`
and it deploys itself. See [CI_CD_OVERVIEW.md](CI_CD_OVERVIEW.md) for the
plain-English walkthrough (what's live, current URLs, how a push turns into
a deployment, custom domain steps), or [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)
for the original one-time AWS setup instructions.
