# PeopleMatrix — private assessor answer key

**Assessor-only.** Do not put this file in the frontend artifact, API static files, candidate brief, or a public deployment. The lab is intentionally unsafe and contains only fictional records. Run it only on an isolated network and a dedicated lab database. These eight scenarios are the complete intentional finding set; a candidate should not be told their number or locations.

Use only non-destructive probes. The `Employee` and `Manager` lab accounts are in `docs/PHASE2_SETUP.md`; the administrator accounts are for assessors and maintainers. IDs below must be discovered from the seeded directory or `/api/v1/me`, not assumed to be fixed.

The suggested points below are the maximum for the corresponding finding area in `assessor/SCORING_GUIDE.md`. They preserve that guide's point breakdown. The remaining 25 points are assessed separately: Methodology & scoping (10), Attack-surface mapping (10), and Evidence/report quality (5). Accept equivalent safe validation and sound severity judgments; the suggested severities are assessor baselines, not a substitute for evaluating candidate rationale.

## 1. Broken object-level authorization — payroll

- **Number:** 1 of 8.
- **Name:** Broken object-level authorization (BOLA/IDOR) — payroll.
- **OWASP category:** OWASP API Security Top 10 2023, API1:2023 Broken Object Level Authorization.
- **Location:** `GET /api/v1/employees/:id/payroll`.
- **Required user role:** Authenticated Employee account; use its own token. No administrator role is required.
- **Discovery approach:** Establish the signed-in employee identity and baseline access to that employee's payroll. Compare the authorization behavior for one different, existing synthetic employee ID. A nearby profile request provides a useful control. Do not enumerate IDs.
- **Safe reproduction:** With an Employee token, request the linked employee's payroll, then change only the payroll URL ID to a different, existing synthetic employee. The endpoint returns that person's payroll despite the token identifying someone else; an unauthenticated request still returns 401. Do not attempt a bulk scrape.
- **Expected evidence:** Redacted request/response pair showing successful access to the caller's own payroll and the other synthetic employee's payroll, with the changed object ID and authenticated role clear; optionally record that an unauthenticated request returns 401 and the unrelated `GET /api/v1/employees/:id` profile endpoint returns 403 for another employee. Do not retain unnecessary payroll values.
- **Business impact:** Cross-employee disclosure of synthetic salary, deductions, and payment details. In a real HR system this would be a serious privacy violation.
- **Suggested severity and rationale:** **High.** An authenticated ordinary employee can access another person's sensitive payroll information by changing an object identifier. The demonstrated cross-employee confidentiality impact is material; the controlled single-record scope and authentication requirement are relevant constraints.
- **Root cause:** Authentication is checked, but the requested object's ownership or an authorised HR role is not.
- **Remediation:** Authorise each payroll object against the authenticated employee ID or an explicitly permitted role before selecting/returning records; retain a default-deny control.
- **Suggested scoring points (15 maximum; BOLA/IDOR rubric):** 0–4 for recognizing object-level authorization risk and selecting a controlled comparison; 0–5 for demonstrating the cross-object access boundary with minimal synthetic data; 0–3 for reproducible evidence and realistic impact; 0–3 for server-side object authorization and regression-test recommendations.
- **Common candidate mistakes:** Enumerating or scraping many employee IDs; treating a valid authenticated response as proof of authorization; overlooking the profile endpoint's 403 control; including unredacted payroll values; or overstating impact beyond the demonstrated single-record access.

## 2. Broken function-level authorization — account creation

- **Number:** 2 of 8.
- **Name:** Broken function-level authorization — account creation.
- **OWASP category:** OWASP API Security Top 10 2023, API5:2023 Broken Function Level Authorization.
- **Location:** `POST /api/v1/admin/users`.
- **Required user role:** Authenticated Employee account is sufficient for the demonstrated unauthorized action. No administrator role is required.
- **Discovery approach:** Compare what the Employee role can do through the UI with direct server-side function access, and compare the account-creation operation with neighboring operations that enforce `SYSTEM_ADMIN`. Do not infer security from a hidden menu.
- **Safe reproduction:** An authenticated Employee can POST a valid fictional `@peoplematrix.test` account with a strong password and an unlinked employee ID (or a `SYSTEM_ADMIN` account with no employee link). The server creates it and returns 201. Maintain only temporary synthetic accounts and remove any created during testing.
- **Expected evidence:** Redacted authenticated request and 201 response demonstrating server-side account creation by an Employee; record the requested role and synthetic account identifier without exposing the password. A controlled comparison may note that `GET /api/v1/admin/users`, account updates, settings, and audit remain `SYSTEM_ADMIN`-only, the administration menu stays hidden from Employee accounts, and unauthenticated account creation returns 401.
- **Business impact:** Unauthorised account provisioning, including privilege escalation through administrative role assignment.
- **Suggested severity and rationale:** **Critical.** An authenticated Employee can create an account assigned `SYSTEM_ADMIN`, enabling a potential jump to the system-administrator role and its privileged capabilities. The required Employee session is a precondition but does not materially constrain the resulting privilege escalation.
- **Root cause:** The POST operation lacks the server-side role check that protects neighbouring administrative operations.
- **Remediation:** Apply explicit `SYSTEM_ADMIN` authorisation to this operation; never treat a hidden UI menu as a security boundary. Consider independent approval for privileged account creation.
- **Suggested scoring points (10 maximum; broken function authorization rubric):** 0–3 for testing server-side function authorization with an appropriately limited account; 0–3 for validating server enforcement rather than UI visibility; 0–2 for plausible impact without unnecessary/persistent accounts; 0–2 for explicit default-deny authorization and verification recommendations.
- **Common candidate mistakes:** Treating a hidden navigation menu as enforcement; testing only unauthenticated access; creating a real or unnecessary account, leaving test data behind, or disclosing its password; failing to distinguish ordinary account creation from the administrator-role escalation demonstrated.

## 3. SQL injection — department search

- **Number:** 3 of 8.
- **Name:** SQL injection — department search.
- **OWASP category:** OWASP Top 10 2021, A03:2021 Injection (SQL injection).
- **Location:** `GET /api/v1/employees/search?department=...`.
- **Required user role:** Any authenticated account is sufficient for the demonstrated behavior; no specific role is required by the scenario.
- **Discovery approach:** Compare ordinary department filtering with carefully controlled input that tests whether the filter is interpreted as data or as part of a SQL expression. Use a read-only, boolean comparison; do not pursue data extraction or destructive tests. The ordinary `GET /api/v1/employees?q=...` search is a useful neighboring control because it remains parameterised.
- **Safe reproduction:** With an authenticated account, compare a known department (for example, `Engineering`) to the same value followed by a boolean `OR` expression such as `Engineering' OR '1'='1`. The latter expands the result set beyond the department. Do not use data-changing SQL, destructive commands, or time-delay probes.
- **Expected evidence:** Redacted requests and result summaries comparing the normal department filter with the boolean-expression input and showing that the latter expands results beyond that department. Avoid copying unnecessary employee records. A comparison with ordinary `GET /api/v1/employees?q=...` may document the secure neighboring behavior.
- **Business impact:** Database read access and exposure of synthetic employee data beyond the intended filter; in a real deployment this could be much worse.
- **Suggested severity and rationale:** **High.** A logged-in user can manipulate a database-backed filter to return records outside the intended department. The demonstrated exposure is read-oriented and constrained by the lab's read-only transaction, but read-only execution does not eliminate confidentiality impact or make the injection safe.
- **Root cause:** The department value is concatenated into raw SQL on this one route. It is executed inside a read-only transaction to reduce the chance of destructive writes; **read-only does not make injection safe**.
- **Remediation:** Use bound parameters or the query builder throughout, validate filter length/type, and enforce least privilege. The read-only transaction is containment, not a fix.
- **Suggested scoring points (15 maximum; SQL injection rubric):** 0–4 for recognizing suspicious input handling and choosing safe validation; 0–5 for controlled comparison demonstrating injection without destructive commands or unnecessary extraction; 0–3 for reproducible evidence and bounded impact; 0–3 for parameterized-query, error-handling, and regression-test recommendations.
- **Common candidate mistakes:** Using destructive statements, time-delay probes, or broad data extraction; reporting ordinary search behavior as injection; treating the read-only transaction as a fix; or claiming write access or full database compromise without evidence.

## 4. Stored cross-site scripting — performance comments

- **Number:** 4 of 8.
- **Name:** Stored cross-site scripting — performance comments.
- **OWASP category:** OWASP Top 10 2021, A03:2021 Injection (cross-site scripting).
- **Location:** Manager/HR performance comment submission and the Performance view.
- **Required user role:** Manager may submit a review for a direct report; HR may submit a performance comment as applicable. An affected user must view the comment in the Performance view; the answer key does not require a particular viewer role.
- **Discovery approach:** Trace a controlled comment entered through the permitted performance-review workflow into its rendered view. Compare with other user-generated text, which is rendered as React text. Do not test with a payload that contacts an external host or accesses real data.
- **Safe reproduction:** Store a comment containing a harmless lab-only HTML event handler that sets `window.__peopleMatrixLabProof = true` (for example, an image with an invalid source and an `onerror` handler). Open the affected Performance view in the lab browser and inspect that variable. Never use an exfiltration URL or real data.
- **Expected evidence:** Record the harmless comment used, the affected view in which it was rendered, and the local `window.__peopleMatrixLabProof` value becoming `true`. Keep the evidence lab-only and omit tokens or unrelated user data.
- **Business impact:** Arbitrary JavaScript in an affected viewer's browser session. This could expose the viewer's lab token or perform actions as them.
- **Suggested severity and rationale:** **High.** Persisted attacker-controlled script executes in the browser session of users viewing the affected Performance view, creating potential session compromise or actions as the viewer. The demonstrated proof must remain harmless; do not claim exfiltration or actual account misuse.
- **Root cause:** The one comment field is inserted into the DOM as HTML without output encoding/sanitisation. The API retains the submitted text.
- **Remediation:** Render comments as plain text; if rich text is required, sanitise against a strict allowlist and enforce an appropriate frontend Content Security Policy.
- **Suggested scoring points (10 maximum; stored XSS rubric):** 0–3 for recognizing stored user-controlled content and tracing input to render; 0–3 for harmless lab-only validation in the affected view; 0–2 for explaining affected viewers and plausible session impact without exfiltration; 0–2 for safe output handling, context-appropriate sanitization, and defense-in-depth recommendations.
- **Common candidate mistakes:** Using a payload that exfiltrates tokens or contacts an external system; confusing reflected with stored behavior; failing to verify execution in the affected view; testing against an unrelated text field; or claiming data theft that was not demonstrated.

## 5. Insufficient server-side token invalidation

- **Number:** 5 of 8.
- **Name:** Insufficient server-side token invalidation.
- **OWASP category:** OWASP API Security Top 10 2023, API2:2023 Broken Authentication; also related to OWASP Top 10 2021 A07:2021 Identification and Authentication Failures.
- **Location:** `POST /api/v1/auth/logout` and JWT authentication.
- **Required user role:** Authenticated Employee account using its own session and token.
- **Discovery approach:** Assess logout/token lifecycle behavior with a self-owned session. Compare client-side logout behavior with whether the server still accepts the same token before its expiration.
- **Safe reproduction:** Save an Employee token before logout, call logout, then use the same captured token on `GET /api/v1/me` before its 45-minute expiry. It still succeeds. Do not use another user's token.
- **Expected evidence:** Record successful logout, then a redacted request using the same self-owned token and a successful `/api/v1/me` response before the stated 45-minute expiry. Do not include the token itself in the report.
- **Business impact:** A copied token remains usable after the legitimate user signs out.
- **Suggested severity and rationale:** **Medium.** Logout does not end the validity of a copied token, leaving a residual account-access window until expiry. The exposure depends on prior token compromise and is bounded by the token's 45-minute lifetime; it does not make forged, expired, or disabled-account tokens valid.
- **Root cause:** Logout does not revoke the JWT, and authentication does not consult a revocation store.
- **Remediation:** Track/revoke token IDs or use server-side sessions; combine with short-lived access tokens and controlled refresh-token revocation. Preserve strong signing and algorithm verification.
- **Suggested scoring points (10 maximum; session/token weakness rubric):** 0–3 for lifecycle testing with a controlled self-owned session; 0–3 for safe validation without another person's token; 0–2 for explaining residual access and assumptions; 0–2 for effective invalidation/revocation and lifecycle recommendations.
- **Common candidate mistakes:** Testing or publishing another user's token; confusing the client's local token removal with server revocation; waiting until after the token expires and then reporting the expired-token response; or claiming permanent access despite the 45-minute expiry.

## 6. Excessive data exposure — directory API

- **Number:** 6 of 8.
- **Name:** Excessive data exposure — directory API.
- **OWASP category:** OWASP API Security Top 10 2023, API3:2023 Broken Object Property Level Authorization (excessive data exposure).
- **Location:** `GET /api/v1/employees`, the directory's list request.
- **Required user role:** Any authenticated account; no specific role is required by the scenario.
- **Discovery approach:** Inspect the authenticated directory list response and compare the returned fields with what the directory function displays and needs. Assess response data, not only the rendered UI.
- **Safe reproduction:** Inspect the authenticated list response in browser network tools. Each employee summary also carries synthetic `salary`, `syntheticNin`, `bankAccount`, and `internalRole` values that the normal directory does not need or display.
- **Expected evidence:** A minimally redacted response excerpt or field list demonstrating that employee summaries include synthetic `salary`, `syntheticNin`, `bankAccount`, and `internalRole`, contrasted with the normal directory's names, work email, job title, and department. Note that no password hashes or signing secrets are returned; do not reproduce the entire directory response.
- **Business impact:** Bulk disclosure of unnecessary synthetic HR/financial identifiers to any authenticated account. The visible UI understates the response's sensitivity.
- **Suggested severity and rationale:** **High.** Any authenticated account receives unnecessary sensitive HR/financial identifiers for directory entries, creating broad exposure relative to the function's need. The values are synthetic in the lab and no password hashes or signing secrets are exposed.
- **Root cause:** The API response includes full-detail fields rather than a minimal, role-appropriate directory DTO.
- **Remediation:** Return only permitted directory fields; put sensitive details behind separately authorised endpoints and use field-level access control.
- **Suggested scoring points (5 maximum; excessive data exposure rubric):** 0–2 for comparing returned data with the directory's legitimate need and the user's access context; 0–2 for minimal, safely redacted evidence and impact; 0–1 for data minimization and field-/role-appropriate authorization recommendations.
- **Common candidate mistakes:** Reporting only what is visible in the UI without inspecting the response; copying the full directory dataset into the report; claiming password or signing-secret exposure; or treating every extra field as equally sensitive without explaining context.

## 7. Limited security misconfiguration — grouped hardening finding

- **Number:** 7 of 8.
- **Name:** Limited security misconfiguration — grouped hardening finding.
- **OWASP category:** OWASP Top 10 2021, A05:2021 Security Misconfiguration.
- **Locations:** Search error responses and common API response headers.
- **Required user role:** An authenticated account is required to trigger the malformed department-search response. Header inspection uses ordinary API responses; no privileged role is specified.
- **Discovery approach:** Review error handling using a malformed, non-destructive search input and inspect common API response headers. Compare the observed behavior with controls retained by the API. Treat these observations as one bounded hardening finding, not multiple unrelated vulnerabilities.
- **Safe reproduction:** Send a malformed SQL expression to the authenticated department-search route and observe the verbose error detail/stack on that route only. Inspect API headers: an unnecessary `X-Server-Version` value is disclosed and `X-Frame-Options` is absent. The API retains `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
- **Expected evidence:** A safely redacted malformed-search response showing verbose error detail/stack on that route only, plus a representative response-header capture showing `X-Server-Version`, the absence of `X-Frame-Options`, and the retained `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`. Do not infer an exploit from header presence/absence alone.
- **Business impact:** Internal implementation detail disclosure and reduced browser-header defence in depth. Treat this as **one** bounded hardening finding, not separate critical vulnerabilities. The retained CSP `frame-ancestors 'none'` mitigates framing in modern browsers; do not claim proven clickjacking from a missing legacy header alone.
- **Suggested severity and rationale:** **Low.** Verbose errors and an unnecessary version header disclose implementation detail, while the missing legacy framing header is mitigated by the retained CSP `frame-ancestors 'none'`. No specific exploit or clickjacking impact is demonstrated; group as one bounded hardening finding.
- **Remediation:** Return generic production errors with server-side diagnostics, omit unnecessary version headers, and apply an appropriate coherent browser-header policy.
- **Suggested scoring points (5 maximum; security misconfiguration rubric):** 0–2 for validating the error/header behavior and distinguishing information exposure from proven exploitability; 0–2 for proportionate impact assessment without overstating isolated hardening; 0–1 for safe error handling and proportionate hardening recommendations.
- **Common candidate mistakes:** Turning the grouped observations into multiple critical findings; claiming proven clickjacking solely because `X-Frame-Options` is absent despite `frame-ancestors 'none'`; overlooking retained defenses; or reporting stack details without redaction.

## 8. Controlled scanner false positive — public health CORS

- **Number:** 8 of 8 (controlled false-positive scenario; not an exploitable vulnerability).
- **Name:** Controlled scanner false positive — public health CORS.
- **OWASP category:** Not applicable as a confirmed vulnerability. The scanner may classify the observed wildcard CORS policy as a CORS misconfiguration.
- **Location:** `GET /api/healthz`.
- **Required user role:** None. The endpoint is public and requires no authentication.
- **Discovery approach:** Independently inspect the scanner-flagged response and determine what data it exposes, whether it requires credentials, whether it permits state change, and whether the same CORS behavior applies to authenticated responses. Do not infer exploitability from `Access-Control-Allow-Origin: *` alone.
- **Competent validation procedure:** Request `GET /api/healthz` directly and from a test browser origin; confirm the response is the fixed `{ "status": "ok" }` and contains no user input or private data. Verify that the response does not include `Access-Control-Allow-Credentials: true`, that it requires no authentication and supports no state change, and that authenticated `/api/v1/*` responses do not return wildcard CORS. Do not send real credentials, attempt to read protected data through a browser, or perform state-changing tests. Based on these observations, document this as non-exploitable in the observed state rather than a confirmed data leak.
- **Safe reproduction / observed condition:** This single public endpoint sends `Access-Control-Allow-Origin: *`, which a scanner may flag as permissive CORS. Its body is a fixed `{ "status": "ok" }`, contains no user input or private data, requires no authentication, and supports no state change. It does **not** send `Access-Control-Allow-Credentials: true`. Authenticated `/api/v1/*` responses do not have wildcard CORS, so browser origins cannot read protected content through this rule. A wildcard on a public static status response provides no new privilege or disclosure.
- **Expected evidence:** A redacted response showing the wildcard origin header and fixed status body, absence of `Access-Control-Allow-Credentials: true`, and a comparison showing authenticated `/api/v1/*` responses do not have wildcard CORS. State explicitly that the health response is public and has no state-changing behavior.
- **Business impact:** No demonstrated confidentiality, integrity, or availability impact in the observed condition. If the health endpoint later returns sensitive data or authenticated responses change their CORS behavior, reassess.
- **Suggested severity and rationale:** **Informational / not a vulnerability.** The public response contains only a fixed status, does not use credentialed CORS, and exposes no protected content or state-changing function. A scanner flag alone does not establish a security impact.
- **Remediation / hardening option:** Restrict origins or remove the header if cross-origin public health checks are unnecessary; it is not an urgent security remediation for this fixed response.
- **Suggested scoring points (5 maximum; false-positive handling rubric):** 0–2 for independent validation rather than accepting scanner output; 0–2 for checking data sensitivity, authentication/credential handling, state change, and realistic exploitability; 0–1 for accurately documenting the bounded, non-exploitable observation.
- **Common candidate mistakes:** Reporting wildcard CORS as a confirmed high/critical data leak without demonstrating access to sensitive data; overlooking credential handling or the difference between the public status response and authenticated APIs; or failing to reconsider the conclusion if response content or behavior changes.
- **Scoring guidance:** Reward candidates who verify response sensitivity and credential handling before classifying it. Reduce marks if they report this scanner observation as a confirmed high/critical data leak without a working exploit. If the health endpoint later begins returning sensitive data, reassess this conclusion.

## Maintainer checks

The separate automated suite in `artifacts/api-server/maintainer-tests/` covers the eight conditions and secure neighbouring routes. It must run against a dedicated synthetic lab database, never production data. It removes the temporary user/review rows it creates. Phase 5 adds the environment reset and assessor workflow; Phase 6 adds the final end-to-end exercise validation.