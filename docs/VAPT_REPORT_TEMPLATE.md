# PeopleMatrix Security Assessment Report

> Replace the prompts below with assessment-specific content. Remove guidance text before delivery where appropriate. Do not include credentials, unnecessary personal data, or evidence that could not be safely collected within the authorised scope.

## Report Information

| Field | Details |
| --- | --- |
| Client / engagement | |
| Assessor | |
| Assessment period | |
| Report date / version | |
| Classification | |

## Executive Summary

Summarise the purpose and outcome of the assessment for a non-technical audience. Describe the overall security posture, material business risks, and priority actions. Do not rely solely on a finding count or technical terminology.

## Scope

### In Scope

| Environment / asset | Identifier or supplied address | Included activities |
| --- | --- | --- |
| | | |

### Out of Scope

List excluded assets, activities, or testing limitations, including any deviations agreed during the engagement.

### Scope Confirmation

Record how the authorised target and rules of engagement were confirmed, and note any scope changes or approvals.

## Methodology

Describe the assessment approach, tools and versions where relevant, testing dates, access levels used, and the manual and automated validation performed. Explain limitations, untested areas, and how potentially sensitive data or state-changing tests were handled. Do not present automated output as a confirmed finding without validation.

## Risk Rating Method

Rate each confirmed finding using **CVSS v3.1** as a consistent technical severity baseline. Record the CVSS vector and score, and map scores to these bands:

| Severity | CVSS v3.1 score |
| --- | --- |
| Critical | 9.0–10.0 |
| High | 7.0–8.9 |
| Medium | 4.0–6.9 |
| Low | 0.1–3.9 |
| Informational | 0.0 or an observation without a scored vulnerability |

Explain the selected vector and assumptions. Consider the likely business impact, affected data or functions, required access, and practical exploitability when prioritising remediation. If business context warrants a different priority from the technical band, state both and justify the adjustment; do not silently change the CVSS score. Mark unconfirmed observations as such rather than assigning them confirmed-vulnerability severity.

## Findings Summary

| Reference | Title | Severity | CVSS v3.1 score | Status |
| --- | --- | --- | --- | --- |
| | | | | |

## Detailed Findings

Duplicate this section for each finding.

### [Reference] — [Title]

| Field | Details |
| --- | --- |
| **Reference** | |
| **Title** | |
| **Severity** | |
| **CVSS v3.1 score and vector** | |
| **Affected Component** | |
| **Status** | Confirmed / Unconfirmed / Not reproducible |

#### Description

Describe the security condition, relevant context, and why it is a vulnerability. Separate observed facts from assumptions.

#### Evidence

Provide concise, dated evidence sufficient to substantiate the finding. Redact credentials, tokens, and unnecessary sensitive data. Identify the relevant request/response, screenshot, or other evidence by a stable reference where applicable.

#### Reproduction Steps

Provide safe, minimal, repeatable steps, including the required access level and preconditions. Avoid destructive actions, unnecessary record access, and instructions that exceed the authorised scope.

#### Business Impact

Explain plausible consequences to the organisation, users, or operations, in context.

#### Technical Impact

Describe affected security properties, data, functions, and the demonstrated extent of impact. Distinguish proven impact from potential impact.

#### Recommendation

Give specific remediation guidance. Include relevant defence-in-depth measures or validation criteria where useful.

## Conclusion

Summarise the overall assessment outcome, the most important remediation priorities, residual risks, and any material limitations.

## Retest Status

| Finding reference | Retest date | Retest result | Evidence / notes |
| --- | --- | --- | --- |
| | | Not retested / Fixed / Partially fixed / Not fixed | |

State whether findings were retested, the scope of any retest, and any remaining issues. If no retest was performed, say so explicitly.