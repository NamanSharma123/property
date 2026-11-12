# AWS deployment configuration

The existing production host is EC2 `i-027d38c918012a2f4`, Elastic IP
`3.104.70.151`, in Sydney (`ap-southeast-2`). It is a `t3.small` with 20 GiB gp3
storage and 1 GiB swap. See [CI/CD overview](CI_CD_OVERVIEW.md) for deployments
and rollback behavior. The previous App Runner deployment is retired.

## GitHub repository configuration

These existing repository secrets and variables are used by the workflows:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `AWS_DEPLOY_ROLE_ARN` | Existing GitHub OIDC role for ECR pushes |
| Secret | `EC2_HOST` | Production SSH host; currently 3.104.70.151 |
| Secret | `EC2_SSH_KEY` | SSH key for the existing ubuntu deployment user |
| Variable | `AWS_REGION` | ap-southeast-2 |
| Variable | `NEXT_PUBLIC_API_URL` | https://api.investview.com.au |

No AWS access key is stored in workflow files. The existing OIDC role must
trust this repository's `main` branch and permit ECR authentication, layer
uploads, and `PutImage` for `properly-frontend` and `properly-backend`.
`apprunner:StartDeployment` is no longer needed. PR check jobs have no OIDC
permission. Static-site deployment uses only the existing SSH credentials.

## Host prerequisites

- Ubuntu user can SSH and use noninteractive sudo, as in the existing setup.
- Docker Engine, Compose plugin, Nginx, curl, flock, tar and GNU coreutils.
- `/opt/properly/docker-compose.yml` contains frontend/backend services bound
  to localhost:3000 and localhost:5000, with restart policies enabled.
- Backend runtime secrets remain in `/opt/properly/backend.env`; never commit
  or copy them into Docker build contexts.
- Nginx virtual hosts and Certbot certificates exist for Investview/API and
  OZFIRSTCHOICE. HTTPS certificate renewal is handled by the existing snap
  Certbot timer. The OZFIRSTCHOICE renewal dry-run passed on 12 November 2026.
- `.github/ec2_known_hosts` contains keys verified through the existing trusted
  SSH connection. If the SSH hostname changes, update the host entries safely.

CI copies its scripts to unique `/tmp` filenames and runs them using sudo.
Container image selection is persisted using a service-specific Compose
override; follow the manual commands in the CI/CD overview to preserve it.

## Costs and retired resources

Mumbai OCR resources were removed with explicit user approval. No Mumbai OCR
recovery backup is retained; see [retirement record](MUMBAI_RETIREMENT.md).
Billing totals remain unverified because the CLI principal lacks Cost Explorer
access. Region-specific inventory is not a complete account-wide billing audit.
