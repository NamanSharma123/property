# Production CI/CD

Production runs on one Sydney EC2 instance (`ap-southeast-2`), behind Nginx.
App Runner is no longer used.

| Application | URL | Runtime |
| --- | --- | --- |
| Property frontend | https://investview.com.au | Docker, localhost:3000 |
| Django API/admin | https://api.investview.com.au | Docker, localhost:5000 |
| OZFIRSTCHOICE | https://ozfirstchoice.com.au | Nginx static files |

## On pull requests

Frontend lint and TypeScript checks, Django system checks, static link checks,
and isolated deployment/rollback tests run for the relevant changed paths.
Pull requests never authenticate to AWS or deploy production.

## On pushes to main

- `frontend-deploy.yml` checks the frontend, builds a Docker image on GitHub's
  runner, pushes its commit SHA tag to ECR, then deploys just the frontend.
- `backend-deploy.yml` checks Django and deploys its commit SHA image similarly.
- `web-deploy.yml` checks static sites and deploys **only `web/`** to OZFIRSTCHOICE.
  `Shelly_CRM/` is committed and link-checked, but has no production domain/deploy.
- `container-deploy.yml` is the shared container build/deploy implementation.
- Each entry workflow also supports manual **Run workflow** from GitHub Actions.

Container builds happen off-server to keep the 2 GiB EC2 instance responsive.
Images are deployed by SHA rather than the mutable `latest` tag. SSH host keys
are pinned in `.github/ec2_known_hosts`. Confirm new host fingerprints through
an already-trusted connection before updating this file after replacing EC2.

Deployments are queued by application and use a shared server-side `flock` so
Compose/static changes cannot race. GitHub concurrency retains at most one
pending run per application; a newer pending run may replace an older pending run.

## Health and rollback

`ops/deploy-container.sh` saves the running image under a local rollback tag,
pulls the new commit image, and recreates only that service. It retries local
health checks (about three minutes plus request timeouts), then checks public
HTTPS. Failures restore the previous image and fail the workflow. A restart
can briefly interrupt that application's requests; this is not a blue/green setup.

The image selection is saved in `/opt/properly/docker-compose.<service>.release.yml`.
For manual service operations, include that override:

```sh
cd /opt/properly
sudo docker compose -f docker-compose.yml -f docker-compose.frontend.release.yml up -d --no-deps frontend
# Substitute backend for frontend when operating on the API.
```

Do not use a plain `docker compose up` after CI deployment: the original base
file still references `latest`. The override records the selected SHA/rollback image.

Backend startup applies database migrations. Container rollback does **not**
reverse database migrations; production migrations must remain backward compatible.

`ops/deploy-static.sh` stages a release, switches the Nginx document-root
symlink, checks HTTP/HTTPS and restores the old symlink on failure. It retains
the current and previous release. Existing manual deployment is converted to
a bootstrap release on the first run. Nginx configuration and certificates
are not replaced by CI.

## Verification

```sh
python ops/check-static.py web Shelly_CRM
python ops/test_deploy.py  # Linux; uses fake Docker/curl in temporary directories
bash -n ops/deploy-container.sh
bash -n ops/deploy-static.sh
```

Run `npm ci`, `npm run lint`, `npm run type-check`, and `npm run build` in
`frontend/`. Run `python manage.py check` with development settings in
`backend-django/` after installing `requirements/dev.txt`.

## Outstanding product setup

OZFIRSTCHOICE's contact form still requires a Web3Forms access key; otherwise
visitors are directed to call/email. Review `web/README.md` for the business
content checklist. CI does not manufacture contact keys or business details.
