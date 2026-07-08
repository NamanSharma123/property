# Properly — Frontend

Next.js 15 (App Router) UI for the Properly property management system. Talks
to the [Django backend](../backend-django/README.md) over a plain JSON REST
API — no server actions or API routes proxy the backend, the browser calls it
directly.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS** + shadcn/radix-ui components (`components/ui/`)
- **SWR** for data fetching/caching (`hooks/use*SWR.ts`)
- **react-hook-form** for forms

## Setup

```powershell
npm install
npm run dev      # http://localhost:3000
```

By default the API base URL is `http://localhost:5000` (see
`lib/api.ts:1`). Override it with an env var if the backend runs elsewhere:

```
NEXT_PUBLIC_API_URL=https://your-api-host
```

There's no `.env` checked in or required for local dev — the default already
points at the local Django server.

## How it talks to the backend

- `lib/api.ts` — the only place that calls the backend. Exports one object
  per resource (`authApi`, `propertiesApi`, `transactionsApi`, `tenantsApi`,
  `expensesApi`, `categoriesApi`, `notificationsApi`). Handles:
  - attaching `Authorization: Bearer <accessToken>`
  - auto-refreshing the access token on a 401 `TOKEN_EXPIRED` and retrying
    once
  - normalizing network/timeout errors into `{ success: false, error }`
- `lib/auth.ts` — thin wrapper around `authApi` used by the rest of the app
  (`login`, `signup`, `logout`, `getSession`, `getCurrentUser`, ...).
- `app/auth/AuthProvider.tsx` — React context that loads the session on
  mount and exposes `{ user, loading, refreshUser }` app-wide.
- Tokens: access token is kept in memory only (cleared on refresh); refresh
  token lives in `localStorage` under `refreshToken`.

## Structure

```
app/
  _components/Landing/     Marketing/landing page sections
  auth/                    Login, signup, AuthProvider
  dashboard/
    _components/           Feature components (per-domain, not route-bound)
    property/ transactions/ tenants (via property)/ documents/
    ocr/ reports/ depreciation/ audit/ bank/ profile/ subscription/ tickets/
  api/status/              Single Next.js route handler (health/status only)
components/ui/             shadcn/radix primitives (button, dialog, table, ...)
hooks/                     SWR data hooks + misc (useProperties, useExpenses,
                           useTenants, useTransactions, useUser, ...)
lib/                       api.ts, auth.ts, pdfService.ts, ocrService.ts,
                           validations.ts, security.ts, password-policy.ts
types/                     Shared TS types (api, auth, database)
```

## Known rough edges (as of this port)

- `config/auth-bypass.ts` and the `firebase` dependency are leftover from an
  earlier prototype and are **not wired into anything** — the real auth path
  is `lib/api.ts` → Django JWT auth. Safe to ignore or remove later.
- OCR image extraction depends on the backend having the Tesseract binary
  installed; PDF text extraction works regardless. See the backend README's
  OCR notes.
