#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "${LAB_ISOLATED_DB:-}" != "1" ]]; then
  echo "Refusing reset: first confirm this is a dedicated synthetic lab with LAB_ISOLATED_DB=1." >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "Refusing reset: a lab-only .env file is required." >&2
  exit 1
fi
if [[ ! -t 0 ]]; then
  echo "Refusing reset: an interactive administrator terminal is required." >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker Compose is required on the dedicated lab VM." >&2
  exit 1
fi

compose=(docker compose --project-name peoplematrix-lab --env-file .env --file docker-compose.yml)
echo "This permanently deletes ALL data in the peoplematrix-lab Compose volumes,"
echo "including candidate changes and audit history. It does not touch the Replit database."
read -r -p 'Type RESET PEOPLEMATRIX LAB to continue: ' confirmation
if [[ "$confirmation" != "RESET PEOPLEMATRIX LAB" ]]; then
  echo "Reset cancelled; no data was changed."
  exit 1
fi

# Build before deleting the old volume so a failed build does not destroy a usable lab.
"${compose[@]}" build
"${compose[@]}" down --volumes --remove-orphans
"${compose[@]}" up --detach --wait --wait-timeout 180
echo "Lab reset completed. The database was recreated and seeded from the application image."