# Automated deploy (GitHub Actions)

`.github/workflows/deploy.yml` deploys the Docker Compose lab to one VM over SSH with password authentication. It runs on every push to `main`, and can be started by hand from **Actions > Deploy to lab VM > Run workflow**.

The isolation rules in the [README](../README.md) still apply: one dedicated lab VM, no public application ingress, and the frontend bound to `127.0.0.1` only. This workflow does not change any of that.

## What a deploy does

1. Runs the deploy script's gate tests (`scripts/deploy/remote-deploy.test.sh`).
2. Connects to the VM with `sshpass` and checks the host key.
3. Uploads the commit as `releases/<sha>-<run>-<attempt>/`. `assessor/`, `attached_assets/` and `.agents/` are excluded, so the private answer key never reaches the VM. Release directories are readable only by the deploy user.
4. Writes `shared/.env` from secrets if `POSTGRES_PASSWORD` and `SESSION_SECRET` are set. If they are not set, it keeps the `.env` already on the VM.
5. Runs `scripts/deploy/remote-deploy.sh` on the VM. That script:
   - builds the images first, so a failed build leaves the running lab alone;
   - runs `docker compose up --wait` and waits for the postgres, backend and frontend health checks;
   - on success, points `current` at the new release, keeps the newest 3 releases, and prunes dangling images;
   - on failure, prints container status and logs, brings the previous release back up, and fails the job.

VM layout under `APP_DIR`:

```
peoplematrix-lab/
  current -> releases/<id>   last release that came up healthy
  releases/<id>/             one directory per deploy
  shared/.env                lab secrets (mode 600), survives every deploy
```

The Compose project name is fixed (`peoplematrix-lab`), so every release reuses the same containers and the same `lab_data` volume. Deploys never delete data. To reset the lab, use `scripts/reset-lab.sh` from `current/` as described in the README.

## Secrets

Add these under **Settings > Secrets and variables > Actions**, either as repository secrets or on the `lab` environment. The job runs in the `lab` environment, so you can also require reviewers there.

| Secret | Required | Notes |
| --- | --- | --- |
| `VM_HOST` | yes | IP or hostname of the VM |
| `VM_USER` | yes | SSH user. Must be in the `docker` group. |
| `VM_PASSWORD` | yes | SSH password for `VM_USER` |
| `VM_PORT` | no | Defaults to `22` |
| `VM_SSH_KNOWN_HOSTS` | recommended | Output of `ssh-keyscan -p <port> <host>`, captured from a trusted network. Without it, the job trusts whatever key the host presents at deploy time and logs a warning. |
| `POSTGRES_PASSWORD` | no | `openssl rand -hex 32`. If set together with `SESSION_SECRET`, the job writes `shared/.env` on every deploy. |
| `SESSION_SECRET` | no | `openssl rand -hex 32`. Use a different value from `POSTGRES_PASSWORD`. |

`POSTGRES_PASSWORD` only takes effect when the `lab_data` volume is first created. If you change the secret later, the backend can no longer log in to the database. To rotate it, run the guarded reset, or change the password inside Postgres first.

## Variables (optional)

| Variable | Default | Notes |
| --- | --- | --- |
| `DEPLOY_APP_DIR` | `peoplematrix-lab` | A relative path resolves against the VM user's home directory |
| `DEPLOY_KEEP_RELEASES` | `3` | Number of release directories to keep |
| `DEPLOY_RUNNER` | `ubuntu-latest` | Set to `self-hosted` (or a runner label) when SSH is only reachable from inside the private network |
| `LAB_PORT` | `8088` | Only used when the job writes `.env` from secrets |

## VM prerequisites

- Docker Engine and the Docker Compose plugin v2.17 or newer, which is needed for `up --wait`.
- `VM_USER` can run Docker without sudo: `sudo usermod -aG docker <user>`, then log in again.
- Password SSH login is enabled for that user (`PasswordAuthentication yes`).
- The runner can reach the VM's SSH port.

## Network access

GitHub-hosted runners connect from GitHub's large and changing IP ranges. The README requires SSH on the lab VM to be limited to a VPN or known assessor IPs, and opening it to those ranges would break that rule. Use one of these instead:

- **Recommended:** register a self-hosted runner inside the VPC/VNet and set `DEPLOY_RUNNER` to its label. The workflow installs `sshpass` if it is missing, which needs passwordless `sudo apt-get` on the runner, or install `sshpass` in advance.
- Or give the job a fixed egress IP (a larger runner with a static IP, or a VPN step) and allow only that IP.

## Moving from a manual install

If the lab was started by hand from another directory, run `docker compose --env-file .env down` there without `-v`, or just leave it running. Copy its `.env` to `<APP_DIR>/shared/.env`, or set the secrets. The first deploy then takes over the same `peoplematrix-lab` containers and volume.

## Testing the deploy script

```sh
bash scripts/deploy/remote-deploy.test.sh     # or: pnpm --filter @workspace/scripts run test:deploy
```

The tests run the real script against a stub `docker`, so they need no daemon or VM. They cover these cases:
- a successful deploy
- a failed build
- a failed health check with rollback
- a failed rollback
- a first deploy with nothing to roll back to
- missing or empty secrets
- release pruning
- argument validation
