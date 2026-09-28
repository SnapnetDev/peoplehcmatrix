# PeopleMatrix

An isolated, synthetic-data HR application being built in phases for authorised cybersecurity assessment.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (managed workflow injects `PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed 75 fictional employees and four lab accounts once
- `LAB_ISOLATED_DB=1 ./scripts/reset-lab.sh` — destructive reset of the dedicated Docker Compose lab only, with confirmation; never run against Replit's development database
- `LAB_ISOLATED_DB=1 pnpm --filter @workspace/api-server run audit:export` — complete private audit history in JSONL, for assessors with lab database access
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — JWT signing secret, at least 32 bytes

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle) and Vite

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- Tables: `lib/db/src/schema/index.ts`
- API routes: `artifacts/api-server/src/routes/`
- Seed and lab-only account setup: `artifacts/api-server/src/seed.ts`, `docs/PHASE2_SETUP.md`

## Architecture decisions

- Build phases are an explicit user requirement: Phase 2 was the secure backend baseline; Phase 4 deliberately weakens only the eight scoped assessment behaviours, with private assessor documentation and regression checks. Phase 5 is reset/deployment documentation; Phase 6 is final validation.
- No real employee data or third-party production service may be used.

## Product

Current phase: Phase 6 — final validation. Development-instance checks and static packaging checks may run in Replit; Docker startup, clean reset, and full container end-to-end verification require a dedicated isolated lab VM and remain pending until one is available. Do not run Docker inside Replit or publish this app. See `assessor/PHASE6_VALIDATION.md` for the verification record. Private assessor details are in `assessor/ANSWER_KEY.md` and `assessor/SCORING_GUIDE.md`; never put them in the web artifact, candidate brief, or API static files. Run maintainer checks only against an isolated synthetic database with `LAB_ISOLATED_DB=1 pnpm --filter @workspace/api-server run test:lab`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Do not expose this intentionally vulnerable lab publicly.** Read `SECURITY-LAB-NOTICE.md`.
- The seed is idempotent; the destructive reset deletes only the dedicated Docker Compose volume after an explicit guard and confirmation. It does not reset the Replit development database.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
