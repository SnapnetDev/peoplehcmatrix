# PeopleMatrix development database and lab accounts

**Lab warning:** This project is intentionally vulnerable and is for an authorised, isolated training environment. Do not expose it to the public Internet or connect it to production systems. The Docker Compose setup and guarded reset procedure are documented in the root `README.md`. This document also covers the earlier local development seed; the reset script does **not** target the Replit development database.

## Development setup

Use the project's PostgreSQL development database. The API needs `DATABASE_URL` and a secret `SESSION_SECRET` containing at least 32 UTF-8 bytes. Neither value belongs in source control. The API fails to start without a sufficiently long signing secret.

```sh
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run seed
```

The seed is idempotent: it inserts records only when the employee table is empty. It creates 75 fictional employees, 75 payroll records, sample leave and performance history, and four lab accounts. Do not run the seed against real employee data. For Docker labs, use the guarded Compose reset before a new candidate; do not share a used development database with a new candidate.

## Lab-only accounts

These are **public test passwords**, not application signing secrets. Never reuse them elsewhere.

| Role | Email | Lab password |
| --- | --- | --- |
| Employee | `employee1@peoplematrix.test` | `Employee-Lab-Only-2026!` |
| Manager | `manager1@peoplematrix.test` | `Manager-Lab-Only-2026!` |
| HR administrator | `hradmin@peoplematrix.test` | `HRAdmin-Lab-Only-2026!` |
| System administrator | `sysadmin@peoplematrix.test` | `SysAdmin-Lab-Only-2026!` |

The candidate brief should normally distribute only the Employee and Manager accounts. Never put these accounts in a production identity system.

## API

The OpenAPI source of truth is `lib/api-spec/openapi.yaml`. Routes are under `/api/v1`, except for `/api/healthz`. Use `Authorization: Bearer <token>` from `POST /api/v1/auth/login`. Some behaviours are intentionally unsafe for this isolated assessment; do not assume these accounts or API routes are suitable for production.

The private assessor materials are outside the web-serving artifacts and must not be shared with candidates. Use the candidate brief in `docs/CANDIDATE_BRIEF.md` for the rules of engagement.