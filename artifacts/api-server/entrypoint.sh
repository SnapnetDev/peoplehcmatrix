#!/bin/sh
set -eu

cd /app
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run seed
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs