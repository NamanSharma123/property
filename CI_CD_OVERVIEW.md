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

## Custom domain — not set up yet, here's how when you're ready

Right now your app lives at the auto-generated `*.awsapprunner.com`
addresses above. Those are real, working, HTTPS-secured URLs — a custom
domain is a nice-to-have for branding, not a functional requirement.

**When you own a domain** (bought through Route 53, GoDaddy, Namecheap,
whatever), here's the process:

1. **AWS Console → App Runner → your service → Custom domains tab → Link domain**
2. Type in the domain/subdomain you want, e.g. `app.yourdomain.com`
3. App Runner gives you 2-3 DNS records to create (usually a CNAME and some
   validation records)
4. Add those records at wherever your domain is registered (Route 53, or
   your registrar's DNS settings page)
5. Wait for DNS to propagate (minutes to a few hours) and AWS to issue an
   HTTPS certificate automatically (App Runner handles this part for you —
   no manual certificate work needed)
6. Once it shows "Active," `app.yourdomain.com` serves the exact same app as
   the `awsapprunner.com` URL — both keep working

Do this for the **frontend** service primarily (that's what users type in
their browser). The backend can stay on its `awsapprunner.com` address
forever since users never see it directly — only the frontend calls it.

If/when you get a domain, tell me the domain name and I'll walk through
this with you step by step, including double-checking the DNS records are
exactly right.

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
