# PeopleMatrix VAPT Assessment — Private Scoring Guide

**Assessor-only. Do not serve this file through the application or include it in candidate-facing materials.** Use this guide alongside the private answer key. Award points for sound, evidenced assessment work; do not require candidates to reproduce an exact payload or wording where an equivalent safe method demonstrates the same competency.

## Score and pass mark

**Total: 100 points. Pass mark: 70/100.**

| Area | Points |
| --- | ---: |
| Methodology & scoping | 10 |
| Attack-surface mapping | 10 |
| BOLA/IDOR | 15 |
| Broken function authorization | 10 |
| SQL injection | 15 |
| Stored XSS | 10 |
| Session/token weakness | 10 |
| Excessive data exposure | 5 |
| Security misconfiguration | 5 |
| False-positive handling | 5 |
| Evidence/report quality | 5 |
| **Total** | **100** |

## Grading rubric

Award points within each area according to the demonstrated behaviours below. Partial credit is appropriate when the candidate identifies a concern but does not safely validate, explain, or report it. Avoid double-counting the same evidence across areas.

### Methodology & scoping — 10 points

- **0–3:** Confirms authorised target, boundaries, and rules before testing; avoids out-of-scope activity.
- **0–3:** Uses a structured, risk-based workflow and records useful testing notes and limitations.
- **0–2:** Combines appropriate manual and automated techniques without treating tool output as proof.
- **0–2:** Uses safe, proportionate validation and stops/escalates when unexpected material risk arises.

### Attack-surface mapping — 10 points

- **0–3:** Systematically identifies relevant application surfaces, functions, and trust boundaries.
- **0–3:** Maps authentication states, roles, and access-controlled functionality.
- **0–2:** Records observations and prioritises areas based on plausible risk.
- **0–2:** Maps before attempting deeper validation; does not make assumptions based only on visible UI.

### BOLA/IDOR — 15 points

- **0–4:** Recognises an object-level authorization concern and selects a controlled comparison.
- **0–5:** Demonstrates that access differs across object ownership/authorization boundaries using minimal synthetic data.
- **0–3:** Captures reproducible evidence and explains affected data and realistic impact.
- **0–3:** Recommends server-side object-level authorization and appropriate regression coverage.

### Broken function authorization — 10 points

- **0–3:** Tests server-side function authorization using an appropriately limited account/context.
- **0–3:** Validates whether a restricted action is enforced by the server, not merely hidden in the interface.
- **0–2:** Explains plausible consequences without creating persistent or unnecessary accounts/data.
- **0–2:** Recommends explicit, default-deny authorization and verification across relevant operations.

### SQL injection — 15 points

- **0–4:** Identifies suspicious input handling and selects a safe, non-destructive validation approach.
- **0–5:** Demonstrates the injection effect with controlled comparisons; does not use destructive commands or unnecessary extraction.
- **0–3:** Provides reproducible evidence and accurately bounds demonstrated impact.
- **0–3:** Recommends parameterized queries, safe error handling, and appropriate regression tests.

### Stored XSS — 10 points

- **0–3:** Recognises a stored, user-controlled content risk and traces the relevant input-to-render context.
- **0–3:** Uses a harmless, lab-only proof and validates execution in an appropriate affected view.
- **0–2:** Explains who may be affected and plausible browser-session impact without exfiltration.
- **0–2:** Recommends safe output handling, context-appropriate sanitization where needed, and defense in depth.

### Session/token weakness — 10 points

- **0–3:** Assesses session/token lifecycle behavior with a controlled, self-owned test session.
- **0–3:** Validates the security consequence without exposing or reusing another person's token.
- **0–2:** Explains the residual access risk and relevant assumptions.
- **0–2:** Recommends effective invalidation/revocation and lifecycle controls.

### Excessive data exposure — 5 points

- **0–2:** Compares returned data with the function's legitimate need and the user's access context.
- **0–2:** Supports the concern with minimal, safely redacted evidence and explains impact.
- **0–1:** Recommends data minimization and field-/role-appropriate response authorization.

### Security misconfiguration — 5 points

- **0–2:** Validates observed configuration/error-handling behavior and distinguishes information exposure from proven exploitability.
- **0–2:** Explains practical impact and avoids overstating isolated hardening observations.
- **0–1:** Recommends proportionate hardening and safe error handling.

### False-positive handling — 5 points

- **0–2:** Independently validates scanner observations rather than reporting tool output as fact.
- **0–2:** Considers data sensitivity, authentication/credentials, state change, and realistic exploitability.
- **0–1:** Reports a non-exploitable observation accurately, with an appropriately bounded conclusion.

### Evidence/report quality — 5 points

- **0–2:** Findings include clear, reproducible evidence and safe reproduction steps.
- **0–2:** Severity, technical/business impact, and remediation are reasoned and proportionate.
- **0–1:** Report is coherent, scoped, appropriately redacted, and distinguishes confirmed findings from limitations.

## Critical behaviours

Consider these behaviours across the whole assessment and reflect their effect in the relevant rubric areas. They are not additional points and do not change the 100-point total.

### Positive behaviours

- Confirms scope and rules of engagement before testing.
- Maps the application before attacking.
- Combines manual and automated testing.
- Validates findings before reporting them.
- Captures reproducible evidence.
- Minimises unnecessary access to sensitive records.
- Explains business impact.
- Remains within the rules of engagement.

### Negative behaviours

- Blindly reports scanner output.
- Attempts destructive actions.
- Accesses unnecessary volumes of records.
- Ignores authorization boundaries.
- Cannot distinguish vulnerability assessment from penetration testing.
- Requires assessor guidance to decide basic testing steps.

Unsafe or out-of-scope conduct must be recorded and escalated under the engagement rules. Do not reward impact claims obtained through prohibited or unnecessarily intrusive actions; award credit only for safe, valid evidence and sound judgment.