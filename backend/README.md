# Properly Backend — Node/Express (legacy)

**Not the active backend.** This is the original Express implementation.
It has been fully ported to Django — see
[`../backend-django/README.md`](../backend-django/README.md), which is what
the frontend actually talks to now. This folder is kept only as a reference
for the original request/response shapes and business logic.

If you do need to run it: `npm install && npm run dev` (needs its own `.env`
with `DATABASE_URL`, `JWT_SECRET`, `PORT` — same variables as the Django
backend, see `src/config/index.js`).
