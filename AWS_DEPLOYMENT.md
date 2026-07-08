# Deploying to AWS

Architecture: two **App Runner** services (one per app), each built from a
Docker image pushed to **ECR** by GitHub Actions. Database stays on **Neon**
(already working — not migrating to RDS). Runtime secrets live in **AWS
Secrets Manager**. GitHub Actions authenticates to AWS via **OIDC** (no
long-lived AWS access keys stored in GitHub).

```
GitHub push to main
   │
   ├─ backend-django/** changed  → backend-deploy.yml  → ECR (properly-backend)  → App Runner (backend)
   └─ frontend/** changed        → frontend-deploy.yml → ECR (properly-frontend) → App Runner (frontend)
```

All AWS setup below is one-time. I can't run these myself — no AWS CLI/credentials
on this machine — so run them yourself via the AWS Console or CLI.

## 1. ECR — two repositories

Console: ECR → Repositories → Create repository (private, default settings) for:
- `properly-backend`
- `properly-frontend`

CLI equivalent:
```bash
aws ecr create-repository --repository-name properly-backend
aws ecr create-repository --repository-name properly-frontend
```

## 2. IAM OIDC provider for GitHub Actions

Console: IAM → Identity providers → Add provider
- Provider type: **OpenID Connect**
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

(Skip this step if your AWS account already has this provider from a previous project — there can only be one per account.)

CLI equivalent:
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

## 3. IAM role for GitHub Actions to assume

Create a role named `github-actions-properly-deploy` with this **trust
policy** (replace `ACCOUNT_ID`, and confirm `NamanSharma123/property` matches
your actual `<org>/<repo>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:NamanSharma123/property:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

And this **permissions policy** (scope the ECR/App Runner resource ARNs down
once you know them — this starter version is repo-wide within the account):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": [
        "arn:aws:ecr:*:ACCOUNT_ID:repository/properly-backend",
        "arn:aws:ecr:*:ACCOUNT_ID:repository/properly-frontend"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "apprunner:StartDeployment",
      "Resource": [
        "arn:aws:apprunner:*:ACCOUNT_ID:service/properly-backend/*",
        "arn:aws:apprunner:*:ACCOUNT_ID:service/properly-frontend/*"
      ]
    }
  ]
}
```

Copy the resulting **role ARN** — you'll need it for the `AWS_DEPLOY_ROLE_ARN` GitHub secret.

## 4. Secrets Manager — runtime app secrets

Create three secrets (Console: Secrets Manager → Store a new secret → Other type of secret → Plaintext):

| Secret name | Value |
|---|---|
| `properly/database-url` | your Neon `DATABASE_URL` (same one in `backend-django/.env` locally) |
| `properly/jwt-secret` | the `JWT_SECRET` from `backend-django/.env` |
| `properly/django-secret-key` | the `DJANGO_SECRET_KEY` from `backend-django/.env` |

## 5. App Runner — backend service

Console: App Runner → Create service
- **Source**: Container registry → Amazon ECR → browse to `properly-backend:latest`
- **Deployment trigger**: Manual (the GitHub Actions workflow calls `start-deployment` explicitly after each push — avoids double-deploys)
- **Port**: `5000`
- **Environment variables**:
  - `DJANGO_SETTINGS_MODULE` = `config.settings.prod`
  - `ALLOWED_HOSTS` = `*` (tighten to your real domain once you have one)
  - `DB_SSL` = `true`
  - `TIME_ZONE` = `Asia/Kolkata`
- **Secrets** (App Runner supports referencing Secrets Manager directly as env vars):
  - `DATABASE_URL` → `properly/database-url`
  - `JWT_SECRET` → `properly/jwt-secret`
  - `DJANGO_SECRET_KEY` → `properly/django-secret-key`
- **Health check**: path `/health`, protocol HTTP
- **Instance role**: needs `secretsmanager:GetSecretValue` on the three secrets above (App Runner will prompt you to create this role — accept it, or attach the permission if creating manually)

Save the **service ARN** — you'll need it for `BACKEND_APPRUNNER_SERVICE_ARN`.
Note the service's default domain (`https://xxxxxxxxxx.us-east-1.awsapprunner.com`) — that's your backend's public URL.

## 6. App Runner — frontend service

Same flow, source = `properly-frontend:latest`, port `3000`, no secrets needed
(the API URL is baked in at build time via `NEXT_PUBLIC_API_URL`, not read at
runtime). Save this service's ARN too, for `FRONTEND_APPRUNNER_SERVICE_ARN`.

## 7. GitHub repo configuration

Settings → Secrets and variables → Actions.

**Secrets** (Repository secrets tab):
| Name | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | the role ARN from step 3 |
| `BACKEND_APPRUNNER_SERVICE_ARN` | from step 5 |
| `FRONTEND_APPRUNNER_SERVICE_ARN` | from step 6 |

**Variables** (Variables tab — not secret, just config):
| Name | Value |
|---|---|
| `AWS_REGION` | e.g. `us-east-1` (wherever you created the resources above) |
| `NEXT_PUBLIC_API_URL` | the backend App Runner domain from step 5, e.g. `https://xxxxxxxxxx.us-east-1.awsapprunner.com` |

## 8. First deploy

Push to `main` touching either `backend-django/**` or `frontend/**` (or run
the workflow manually from the Actions tab via `workflow_dispatch`). Watch
the Actions tab — `test`/`build-check` run first, then `build-and-deploy`
builds the Docker image, pushes to ECR, and triggers the App Runner
deployment. App Runner takes a minute or two to roll out.

## What's NOT covered here (deliberately, for a first deploy)

- **Custom domain / HTTPS cert** — App Runner gives you a working HTTPS URL
  immediately (`*.awsapprunner.com`). Attaching your own domain is an
  App Runner Console → Custom domains step once you have one, plus a
  CNAME/Route53 record — ask me when you're ready for that.
- **CORS tightening** — `backend-django/config/settings/base.py`'s
  `CORS_ALLOWED_ORIGIN_REGEXES = [r'.*']` currently allows any origin. Fine
  for getting deployed; tighten to your real frontend domain before this is
  public-facing with real user data.
- **RDS migration** — staying on Neon; revisit only if you have a concrete
  reason to move.
- **Redis/ElastiCache** — not needed yet (nothing in the app uses it).
