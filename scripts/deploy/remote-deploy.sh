#!/usr/bin/env bash
# Activates an uploaded release on the lab VM. Run by .github/workflows/deploy.yml
# over SSH (`bash -s -- <app_dir> <release_id> [keep]`), or by hand on the VM.
#
# Layout under <app_dir>:
#   releases/<release_id>/  source tree uploaded by the workflow
#   shared/.env             lab secrets; created once, survives every deploy
#   current -> releases/<id> the last release that came up healthy
#
# The Compose project name is fixed (`name: peoplematrix-lab` in docker-compose.yml),
# so every release reuses the same containers and the same lab_data volume.
set -euo pipefail

app_dir="${1:?usage: remote-deploy.sh <app_dir> <release_id> [keep_releases]}"
release_id="${2:?usage: remote-deploy.sh <app_dir> <release_id> [keep_releases]}"
keep="${3:-3}"
wait_timeout="${DEPLOY_WAIT_TIMEOUT:-300}"

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$release_id" =~ ^[A-Za-z0-9._-]+$ ]] || fail "invalid release id: $release_id"
[[ "$keep" =~ ^[1-9][0-9]*$ ]] || fail "keep_releases must be a positive integer, got: $keep"
[[ -d "$app_dir" ]] || fail "app dir $app_dir does not exist"
# Absolute from here on: the .env and current symlinks must not depend on the cwd.
app_dir="$(cd "$app_dir" && pwd -P)"

releases="$app_dir/releases"
release="$releases/$release_id"
shared_env="$app_dir/shared/.env"
current_link="$app_dir/current"

command -v docker >/dev/null 2>&1 || fail "docker is not installed on the VM"
docker compose version >/dev/null 2>&1 || fail "the Docker Compose plugin is not installed on the VM"
docker info >/dev/null 2>&1 || fail "user $(id -un) cannot reach the Docker daemon; add it to the docker group (sudo usermod -aG docker $(id -un)) and reconnect"

[[ -f "$release/docker-compose.yml" ]] || fail "release not uploaded: $release/docker-compose.yml is missing"
[[ -f "$shared_env" ]] || fail "$shared_env is missing; set the POSTGRES_PASSWORD and SESSION_SECRET secrets, or create it on the VM from .env.example (see README)"
for key in POSTGRES_PASSWORD SESSION_SECRET; do
  grep -Eq "^${key}=.+" "$shared_env" || fail "$key is empty in $shared_env"
done
chmod 600 "$shared_env"

compose_in() {
  (cd "$1" && docker compose --env-file .env --file docker-compose.yml "${@:2}")
}

previous=""
if [[ -L "$current_link" ]]; then
  previous="$(readlink -f "$current_link")"
fi

ln -sfn "$shared_env" "$release/.env"

# Build before touching the running stack: a failed build leaves the old release serving.
log "building release $release_id"
compose_in "$release" build --pull

log "starting release $release_id (waiting up to ${wait_timeout}s for health checks)"
if ! compose_in "$release" up --detach --remove-orphans --wait --wait-timeout "$wait_timeout"; then
  compose_in "$release" ps || true
  compose_in "$release" logs --tail 80 || true
  if [[ -n "$previous" && -d "$previous" && "$previous" != "$(readlink -f "$release")" ]]; then
    log "rolling back to $(basename "$previous")"
    if compose_in "$previous" up --detach --build --remove-orphans --wait --wait-timeout "$wait_timeout"; then
      fail "release $release_id failed its health checks; rolled back to $(basename "$previous")"
    fi
    fail "release $release_id failed its health checks and the rollback to $(basename "$previous") also failed"
  fi
  fail "release $release_id failed its health checks; no previous release to roll back to"
fi

ln -sfn "$release" "$current_link"
log "release $release_id is live"
compose_in "$release" ps

# Keep the newest $keep releases (the live one always survives), then drop dangling images.
active="$(readlink -f "$current_link")"
while IFS= read -r old; do
  [[ "$(readlink -f "$old")" == "$active" ]] && continue
  log "pruning old release $(basename "$old")"
  rm -rf -- "$old"
done < <(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +"$((keep + 1))" | cut -d' ' -f2-)
docker image prune --force >/dev/null || true
