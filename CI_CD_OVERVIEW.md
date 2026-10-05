# From VS Code to Production on AWS — how this project actually deploys

This is the walkthrough of everything that happens between you
writing code in VS Code and a real user opening the app in their browser.
For the original one-time setup steps, see [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md).

## The whole journey, in one picture

```
 1. You write code in VS Code
         │
 2. git push origin main
         │
 3. GitHub Actions wakes up (.github/workflows/*.yml)
         │
         ├─ Runs quick checks (Django `manage.py check`, frontend lint + type-check)
         │
         ├─ Builds a Docker image (backend-django/Dockerfile or frontend/Dockerfile)
         │
         ├─ Pushes that image to Amazon ECR (your account's private image storage)
         │
         └─ Tells AWS App Runner "redeploy from the new image"
                 │
 4. AWS App Runner pulls the new image and starts it
         │
 5. Your app is live at its https://...awsapprunner.com URL
```

Steps 3-4 take a few minutes and need zero manual action from you — that's
the entire point of CI/CD ("Continuous Integration / Continuous Deployment"):
push code, everything else happens on its own.

## What's live right now

| | URL |
|---|---|
| **Frontend** (what users open) | https://5yy6ei9nup.ap-southeast-2.awsapprunner.com |
| **Backend API** (what the frontend talks to) | https://jsamju3nmy.ap-southeast-2.awsapprunner.com |

Both are real, running servers in AWS's Sydney region (`ap-southeast-2`),
connected to your Neon Postgres database.

## The AWS services involved, and what each one actually does

| Service | Plain-English job | Named resource |
|---|---|---|
| **ECR** (Elastic Container Registry) | A private warehouse for your Docker images. GitHub Actions drops a new image here every time you push code. | `properly-backend`, `properly-frontend` repos |
| **App Runner** | Actually runs your app 24/7. Pulls the image from ECR, starts it, gives it a public HTTPS address, restarts it if it crashes, and can scale it up if traffic grows. This is the "server" — but AWS manages the actual machine underneath, not you. | `properly-backend`, `properly-frontend` services |
| **Secrets Manager** | A locked box for sensitive values — your database connection string and security keys. App Runner reads from here at startup instead of those values being hardcoded anywhere. | `properly/database-url`, `properly/jwt-secret`, `properly/django-secret-key` |
| **IAM** (Identity and Access Management) | Controls who/what is allowed to do what in your AWS account. This is what lets GitHub Actions log in and deploy without you ever typing an AWS password into GitHub. | Role: `github-actions-properly-deploy` |
| **Neon** (not AWS) | Your actual Postgres database — separate from AWS, already set up before this deployment work, left as-is. | — |

## What happens on every `git push`

Concretely, step by step, once you push to `main`:

1. **GitHub notices** the push touched either `backend-django/` or `frontend/` (or both) and starts the matching workflow(s) in `.github/workflows/`.
2. **Quick sanity check** runs first — for the backend, `python manage.py check`; for the frontend, lint + TypeScript type-check. If these fail, the pipeline stops here and nothing gets deployed — this is your safety net against pushing broken code to production.
3. **Docker build** — the exact same `Dockerfile` you can run on your own machine builds a fresh image with your latest code.
4. **Push to ECR** — the new image is uploaded, tagged both with `latest` and with the specific commit hash (so you can always trace which code is running).
5. **Deploy trigger** — GitHub Actions tells App Runner "there's a new image, redeploy." App Runner pulls it, health-checks it, and only switches traffic over once the new version is confirmed healthy — so a bad deploy doesn't take the site down, it just fails to roll out and the old version keeps serving traffic.

You can watch all of this happen live: GitHub repo → **Actions** tab → click the running workflow.

## Attach `investview.com.au`

The app is already deployed at the App Runner URLs above. Map the website,
API, and Django admin to separate hostnames:

| Purpose | Hostname | App Runner service |
|---|---|---|
| Website | `investview.com.au` (and optionally `www.investview.com.au`) | `properly-frontend` |
| API and Django admin | `api.investview.com.au` (`/api/...` and `/admin/`) | `properly-backend` |

In AWS Console, open each App Runner service → **Custom domains** → **Link
domain**. Link the website hostname(s) to the frontend service and
`api.investview.com.au` to the backend service. For every hostname, App Runner
shows the required DNS target and certificate validation records. Copy those
records exactly into the DNS zone at your domain registrar, then wait until
App Runner reports the domain as **Active**. Keep existing MX/TXT records used
for email; only add or change the records App Runner specifies. Do not guess
the CNAME/validation targets.

After the API hostname is active:

1. In GitHub repository **Settings → Secrets and variables → Actions → Variables**,
   set `NEXT_PUBLIC_API_URL` to `https://api.investview.com.au`.
2. Set the App Runner backend service `ALLOWED_HOSTS` environment variable to
   `api.investview.com.au` and `CORS_ALLOWED_ORIGINS` to
   `https://investview.com.au,https://www.investview.com.au` (include `www`
   only if you linked it).
3. Deploy the frontend workflow so its browser bundle uses the new API URL.
   Restart/redeploy the backend after changing its environment variables.
4. Check `https://investview.com.au`, sign in, check an API-backed page, and
   open `https://api.investview.com.au/admin/` to confirm the Django admin
   login page loads. The frontend app's own admin screens remain under the
   website; Django's built-in admin is served by the backend at `/admin/`.

The API hostname is used by browser JavaScript, so it needs a trusted HTTPS
certificate too. The app code now defaults CORS to the website domains and
lets you override the list with `CORS_ALLOWED_ORIGINS`.

## Things worth doing before this handles real users' data

(Carried over from `AWS_DEPLOYMENT.md`, restated here since this is the
"current state" document — not urgent, but real gaps):

- **CORS is wide open** (`backend-django/config/settings/base.py` allows any
  website to call the API). Fine for now, should be locked to just your
  frontend's domain before going fully public.
- **No billing alert set up yet** — cheap at this scale, but worth a
  CloudWatch billing alarm so nothing surprises you.
- **The IAM user used to bootstrap all this has full admin access** —
  reasonable for initial setup, worth scoping down or rotating the access
  key periodically going forward.
