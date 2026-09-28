# PeopleMatrix — Phase 6 validation record (private)

**Assessor/administrator only.** Keep this file, test output, and the answer key away from candidates. Never publish this intentionally vulnerable application. Use synthetic data and a dedicated isolated lab VM only.

## Verified in Replit's synthetic development environment

- Workspace typecheck passed.
- All four seeded roles signed in and reached `/api/v1/me`; the authenticated directory contained 75 synthetic employees.
- The eight intentional-scenario maintainer checks passed against the synthetic development database. Temporary test rows were removed by the suite.
- The audit export previously read 34 JSONL records without printing their contents; it has not been exercised against a Docker container.
- Compose configuration parsed with placeholder environment values and retained the loopback-only frontend port, unpublished backend/database, and internal database network. This is a **static check**, not a running-container check.
- The reset script refused to run without `LAB_ISOLATED_DB=1`. No destructive reset was performed.
- Direct Vite `/@fs/` requests for assessor files were blocked by both preview servers; no assessor content appeared in the fallback HTML routes. The API did not serve the assessor files.
- A development browser preview rendered the login page. An earlier controlled Phase 4 browser proof confirmed that the intentionally stored comment executed in its affected view and its test record was removed. This does not verify the Docker-hosted browser flow.

**Not verified:** Docker image builds, container health, private VM networking, container-hosted browser journeys, audit export inside the container, destructive reset/reseed, and cloud VM access controls. Docker is prohibited inside this Replit workspace. Do not mark the lab ready for candidates until these pass on the dedicated VM.

## Remaining acceptance procedure — dedicated isolated VM only

Before running any command, confirm the machine is the intended single-purpose lab VM, the network permits only the authorised management route, there is **no public app ingress**, and the Compose project/volume belong solely to this lab. Do not run this procedure on the Replit development database or a shared/production machine. Keep a private record of pass/fail status and any failures, without passwords or tokens.

1. Review `.env` permissions and confirm `POSTGRES_PASSWORD` and `SESSION_SECRET` are distinct generated lab-only values. Check for existing `peoplematrix-lab` containers/volumes before proceeding; **do not overwrite an active exercise**.
2. From the repository root, run `docker compose --env-file .env up --build --detach --wait --wait-timeout 180`. Confirm `docker compose --env-file .env ps` reports `frontend`, `backend`, and `postgres` healthy. Check `docker compose --env-file .env port frontend 8080` returns only `127.0.0.1:<LAB_PORT>`; neither backend port 8080 nor PostgreSQL port 5432 may be published. Test `curl -fsS http://127.0.0.1:8088/api/healthz` on the VM (adjust for `LAB_PORT`). Do not open network ports to fix failures.
3. Run the private checks *inside the backend container*, connected only to its dedicated synthetic database:

   ```sh
   docker compose --env-file .env exec -T \
     -e LAB_ISOLATED_DB=1 -e LAB_BASE_URL=http://127.0.0.1:8080 \
     backend pnpm --filter @workspace/api-server run test:lab
   ```

   Expect all eight checks to pass, including sign-in and `/me` access for the four seeded roles and exactly 75 synthetic directory employees. The backend image carries the lab setup fixture, one test suite, and the relevant frontend source for the XSS renderer assertion; it does **not** include the private answer key or scoring guide.
4. Through an authorised SSH tunnel, check the candidate browser flow (login, dashboard, directory, employee self-service), manager team/performance flow, and the administrator Audit UI. Confirm role restrictions and redirects, page reloads, and API responses. Use a harmless local-only stored-comment proof in the affected view, then remove its synthetic test row. Never use exfiltration payloads. Verify that no assessor content can be downloaded from nginx, `/api`, static assets, or the candidate brief.
5. Export and protect the complete audit history as documented in `README.md`. Check that login, access, and test activity appear with useful timestamps/actions. Source IP may be the proxy address. Keep the export outside candidate-accessible paths.
6. **Reset acceptance (destructive, authorised administrator only):** When no candidate session is active, create a uniquely named *fictional* temporary lab account or other reversible marker, record its identity and a pre-reset audit event in the private validation notes, then run `LAB_ISOLATED_DB=1 ./scripts/reset-lab.sh` in an interactive terminal. Read its warning and type the exact requested phrase only after verifying the target. This destroys the dedicated Compose volume and its candidate changes/audit history; never substitute a broad volume-deletion command.
7. After reset, check all three containers are healthy; the marker is absent; the seeded account set and 75 fictional employees are restored; and the pre-reset audit event is absent (inspect before generating new activity). Re-run the private suite and a browser smoke check against the clean lab. Confirm no other Docker volume or database was touched.
8. Record the actual VM results, any corrective changes, and a final pass/fail decision here. An unverified item is not a pass. Do not release the lab to candidates until every applicable check passes.

## Final decision

**Pending dedicated isolated VM validation.** Development checks pass, but the Docker/runtime/reset acceptance criteria have not yet been executed.