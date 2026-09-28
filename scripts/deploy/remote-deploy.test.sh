#!/usr/bin/env bash
# Gate tests for remote-deploy.sh. Runs the real script against a stub `docker` that
# records every call, so no daemon, network or VM is needed. Usage: bash remote-deploy.test.sh
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$here/remote-deploy.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Stub docker: logs "<cwd basename>: <args>", fails `build` when STUB_FAIL_BUILD=1 and
# `up` when the cwd basename is listed in STUB_FAIL_UP.
mkdir -p "$work/bin"
cat > "$work/bin/docker" <<'STUB'
#!/usr/bin/env bash
here="$(basename "$PWD")"
echo "$here: $*" >> "$STUB_LOG"
case "$1" in
  info|version|image) exit 0 ;;
esac
[[ "$1" == compose ]] || exit 0
for a in "$@"; do
  [[ "$a" == build && "${STUB_FAIL_BUILD:-}" == 1 ]] && exit 1
  if [[ "$a" == up && " ${STUB_FAIL_UP:-} " == *" $here "* ]]; then exit 1; fi
done
exit 0
STUB
chmod +x "$work/bin/docker"
export PATH="$work/bin:$PATH"

pass=0 failed=0
ok() { pass=$((pass + 1)); echo "ok   - $1"; }
not_ok() { failed=$((failed + 1)); echo "FAIL - $1"; }
check() { local name="$1"; shift; if "$@"; then ok "$name"; else not_ok "$name"; fi; }

new_app() {
  app="$work/app-$RANDOM$RANDOM"
  mkdir -p "$app/shared"
  printf 'POSTGRES_PASSWORD=pw\nSESSION_SECRET=ss\n' > "$app/shared/.env"
  export STUB_LOG="$app/docker.log"
  : > "$STUB_LOG"
}
upload() { mkdir -p "$app/releases/$1"; echo "name: peoplematrix-lab" > "$app/releases/$1/docker-compose.yml"; }
# shellcheck disable=SC2163 # "$@" holds NAME=value pairs, exported on purpose
deploy() { ( unset STUB_FAIL_UP STUB_FAIL_BUILD; export "$@"; bash "$script" "$app" "$rel" "${KEEP:-3}" ) > "$app/out.log" 2>&1; }
current() { basename "$(readlink -f "$app/current")"; }

# 1. First deploy goes live and wires the shared .env into the release.
new_app; rel=r1; upload r1
deploy; rc=$?
check "first deploy exits 0" test "$rc" -eq 0
check "first deploy points current at r1" test "$(current)" = r1
check "release .env is a symlink to shared/.env" test "$(readlink "$app/releases/r1/.env")" = "$app/shared/.env"
check "shared .env is chmod 600" test "$(stat -c %a "$app/shared/.env")" = 600
check "build runs before up" bash -c "grep -n 'compose' '$STUB_LOG' | grep -m1 -E ' (build|up) ' | grep -q build"
check "up waits for health checks" grep -q 'up --detach --remove-orphans --wait --wait-timeout 300' "$STUB_LOG"

# 2. A release that fails health checks rolls back to the previous one and fails the job.
rel=r2; upload r2
deploy STUB_FAIL_UP=r2; rc=$?
check "unhealthy release exits non-zero" test "$rc" -ne 0
check "unhealthy release leaves current on r1" test "$(current)" = r1
check "rollback brings r1 back up" grep -q '^r1: compose .* up --detach --build' "$STUB_LOG"
check "rollback is reported" grep -q 'rolled back to r1' "$app/out.log"

# 3. A failed rollback is reported as such, not as a successful rollback.
rel=r3; upload r3
deploy STUB_FAIL_UP="r3 r1"; rc=$?
check "failed rollback exits non-zero" test "$rc" -ne 0
check "failed rollback is reported" grep -q 'rollback to r1 also failed' "$app/out.log"

# 4. A failed build never touches the running stack.
rel=r4; upload r4; : > "$STUB_LOG"
deploy STUB_FAIL_BUILD=1; rc=$?
check "failed build exits non-zero" test "$rc" -ne 0
check "failed build never runs up" bash -c "! grep -q ' up ' '$STUB_LOG'"
check "failed build leaves current on r1" test "$(current)" = r1

# 5. First-ever deploy that fails has nothing to roll back to.
new_app; rel=r1; upload r1
deploy STUB_FAIL_UP=r1; rc=$?
check "failed first deploy exits non-zero" test "$rc" -ne 0
check "failed first deploy says no rollback" grep -q 'no previous release' "$app/out.log"
check "failed first deploy creates no current link" test ! -e "$app/current"

# 6. Missing or empty secrets stop the deploy before docker compose runs.
new_app; rm "$app/shared/.env"; rel=r1; upload r1
deploy; rc=$?
check "missing .env exits non-zero" test "$rc" -ne 0
check "missing .env is explained" grep -q 'shared/.env is missing' "$app/out.log"
new_app; printf 'POSTGRES_PASSWORD=\nSESSION_SECRET=ss\n' > "$app/shared/.env"; rel=r1; upload r1
deploy; rc=$?
check "empty POSTGRES_PASSWORD exits non-zero" test "$rc" -ne 0
check "no compose build/up without secrets" bash -c "! grep -q 'compose --env-file' '$STUB_LOG'"

# 7. Pruning keeps the newest N releases and never the live one.
new_app
for i in 1 2 3 4 5; do rel="r$i"; upload "$rel"; touch -d "2026-01-0$i" "$app/releases/$rel"; done
rel=r5; KEEP=2 deploy; rc=$?
check "prune deploy exits 0" test "$rc" -eq 0
check "prune keeps exactly 2 releases" test "$(find "$app/releases" -mindepth 1 -maxdepth 1 | wc -l)" -eq 2
check "prune keeps the live release" test -d "$app/releases/r5"
# Live release older than the newest ones must still survive.
rel=r5; upload r9; touch -d "2026-02-01" "$app/releases/r9"; touch -d "2025-01-01" "$app/releases/r5"
KEEP=1 deploy; rc=$?
check "old-but-live release survives pruning" test -d "$app/releases/r5"

# 8. Argument validation.
new_app; rel='../escape'; deploy; rc=$?
check "path-like release id is rejected" test "$rc" -ne 0
rel=r1; upload r1; KEEP=0 deploy; rc=$?
check "keep=0 is rejected" test "$rc" -ne 0

# 9. A relative app dir (home-relative on the VM) still yields absolute symlinks.
new_app; rel=r1; upload r1
( cd "$work" && unset STUB_FAIL_UP STUB_FAIL_BUILD && bash "$script" "$(basename "$app")" r1 ) > "$app/out.log" 2>&1; rc=$?
check "relative app dir deploy exits 0" test "$rc" -eq 0
check "relative app dir gives absolute .env link" test "$(readlink "$app/releases/r1/.env")" = "$app/shared/.env"

echo "# $pass passed, $failed failed"
[[ "$failed" -eq 0 ]]
