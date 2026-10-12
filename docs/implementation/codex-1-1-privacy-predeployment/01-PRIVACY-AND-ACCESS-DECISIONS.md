# Privacy and access contract

October 10, 2026. **Approved principle:** existing answers are private. Explicit participant sharing plus exact verified context is necessary for future facilitator/group access. Role, enrollment, and legacy pointers are insufficient. The following current-state findings are **verified from code**, not deployed database observations.

## Evidence key

| Key | Code-derived fact and exact source |
| --- | --- |
| P | Owner identity permits raw/results; anonymous denies; nonowner requires consent, facilitator visibility and exact scope. Group sharing denies. `lib/platform/response-sharing-policy.ts:21`, `:25`, `:29`. |
| C | Cohort adapter verifies identity, active respondent/viewer membership and facilitator assignment; requires one applicable offering. Durable response scope is null and consent absent. Definitions filtered before bodies; archived/embedded nonowner bodies skipped. `lib/platform/response-library.ts:216`, `:228`, `:243`, `:246`, `:132`, `:142`, `:173`. |
| O | Own library resolves participant from session before owner-scoped enrollment/history/LMU queries. Private helper calls omit nonowner audience only behind those trusted guards. `lib/platform/response-library.ts:274`, `:281`, `:288`, `:299`, `:305`. |
| R | Assessment-result list/detail use current viewer ownership before answers/full snapshots; detail also checks experience password. `lib/assessment-results.ts:16`, `:36`, `:67`. |
| A | Admin Journey answer selection and CSV guard ownership before bodies. LMU admin page fetches operational progress independently and queries results only if owner. `lib/platform/response-library.ts:299`; `lib/admin/wayfinders/export.ts:21`; `app/admin/life-mapping-u/[assessmentId]/page.tsx:15`. |
| J | Operational Journey projects enrollment/completion and only snapshot completion, without answer payloads. `lib/admin/wayfinders/journey.ts:20`, `:42`. |
| H | Hub names are currently signed-in-visible; contacts require effective Hub permission and target active membership. `app/hubs/[hubSlug]/page.tsx:38`, `:39`; `app/hubs/[hubSlug]/members/[participantId]/page.tsx:18`, `:20`, `:23`. |
| B | Builder/preview/publish/enrollment actions require global admin entry before their course helper. Effective creator permissions are a different system. `lib/experiences/admin/block-mutations.ts:87`; `lib/experiences/admin/preview.ts:15`; `lib/experiences/admin/version-release.ts:10`; `lib/experiences/admin/enrollment-mutations.ts:9`; `lib/platform/effective-access-policy.ts:51`. |

## Data classification and query boundary

Every row's implementation description is **verified from code**; future audience recommendations are **proposed policy**. No operational label makes answer-derived material non-sensitive.

| Resource | Current caller/role and ownership | Verified scope / consent | Query / error boundary | Recommended boundary |
| --- | --- | --- | --- | --- |
| Personal reflection text, notes, Companion entries | Own library or owner-admin CSV/Journey; session participant must equal respondent (O/A) | Owner identity; no nonowner durable consent | `participant_responses.response_data`, archived removed responses, `participant_companion_entries.entry_data`, personal notes. Ownership before private query; errors reject (A/O). | Private; independently opt in each explicit facilitator/group scope. Do not share notes by sharing another assessment. |
| Raw assessment answers | Owner native/LMU library, admin only if also respondent (P/R/A) | Same owner; C lacks binding/consent | `participant_responses`, `lmu_responses`; no nonowner body query (C/A). | Private; consent must specifically include raw answers. |
| Interpreted assessment results | Own result list/detail; LMU owner-admin page (R/A) | Owner; future consent independent of raw visibility | `lmu_results.result_data`, generic derived response payloads, full archived snapshot in own result completion resolution. Identity error rejects; some missing/error detail reads return unavailable/null (`lib/assessment-results.ts:72`, `:84`). | Treat as sensitive individual data. Super Admin blanket result access undecided: **OWNER APPROVAL REQUIRED**. |
| Operational completion/progress | Own dashboard; global operational admin Journey and LMU progress page (J/A; `lib/platform/dashboard.ts:25`) | Existing admin/session gates; no response-sharing consent required by current code | Enrollment status/timestamps, `lmu_section_progress` status/current step; archived completion projection. J errors reject; A prerequisites reject. | Separate endpoint/projection from answers. Exact facilitator/admin reporting scope **OWNER APPROVAL REQUIRED**. |
| Aggregated analytics | Admin analytics architecture page | No verified implemented aggregate policy or consent model | Placeholder, no verified aggregate query (`app/admin/analytics/page.tsx:2`) | Approved scopes, suppress small cells and narrative answers; proposed minimum cell 10. **OWNER APPROVAL REQUIRED**. |
| Course metadata | Public/eligible Hub/catalog, admin authoring/preview (H/B) | Hub member/manager influences offering visibility; course helper checks course/org assignments, after global entry | Hub `experiences` title/slug/type; preview definitions with null response; hierarchy errors reject. Some Hub metadata reads ignore errors (`app/hubs/[hubSlug]/page.tsx:34`, `:36`). | Public metadata only where published/visible; drafts to scoped creators. No private participant data in previews. |
| Hub directory names/initials | Any signed-in user, even nonmember (H) | No viewer membership condition on names; no consent evidence | Active member IDs then participants names; errors reject. | Exact active Hub membership or approved scoped exception. **OWNER APPROVAL REQUIRED**. |
| Public profile information | Current Hub contact route is permissioned PII, not an opt-in public profile (H) | Fresh effective Hub permission + target active membership; no public consent checked | Names/bio/email/phone/location/timezone fetched only after permission/membership; new prerequisite errors reject. | Explicit public opt-in for name/bio only; contact remains restricted. No public-profile publication in this iteration. **OWNER APPROVAL REQUIRED**. |

## Full response-body decision table

**Verified from code:** current implementation is owner-only for all legacy sharing labels (P/C/R/A). **Verified by isolated test:** all 27 level/role combinations assert both raw and result decisions without durable consent in `scripts/security/codex1-1.test.mjs:24`. A positive pure facilitator fixture is a contract test, not an enabled sharing path.

**Proposed policy / approved sharing principle:** desired states below require both application and RLS enforcement. Roles are nonowner unless the row says respondent; an Admin who is also the respondent follows the respondent row. Exact group membership is separate from a Hub/course/admin role. “Evidence absent” means the current adapter provides no durable consent/binding; it does not claim a live inventory found none anywhere.

| Level | Role | Current raw + individual result | Desired policy | Durable evidence in adapter | Status / source |
| --- | --- | --- | --- | --- | --- |
| Private | Respondent | Allow | Allow own | Session owner | Implemented P/O/R |
| Private | Assigned facilitator | Deny | Deny | Absent | Implemented restrictive P/C |
| Private | Same-cohort participant | Deny | Deny | Absent | Implemented restrictive P/C |
| Private | Unrelated participant | Deny | Deny | Absent | Implemented restrictive P |
| Private | Hub leader | Deny | Deny by role | Absent | Implemented restrictive P/A |
| Private | Course Creator | Deny | Deny by role | Absent | Implemented restrictive P/B |
| Private | Admin | Deny | Deny raw; individual-result exception undecided | Absent | Restricted; result exception **OWNER APPROVAL REQUIRED** P/A/R |
| Private | Super Admin | Deny | Deny raw; blanket individual-result access undecided | Absent | Restricted; result exception **OWNER APPROVAL REQUIRED** P/A/R |
| Private | Anonymous | Deny | Deny | No identity | Implemented P |
| Facilitator Shared | Respondent | Allow | Allow own | Session owner | Implemented P/O |
| Facilitator Shared | Assigned facilitator | Deny | Allow only explicit consent + exact active cohort/assignment, separately for raw/results | Absent | Blocked durable model P/C |
| Facilitator Shared | Same-cohort participant | Deny | Deny | Absent | Implemented restrictive P/C |
| Facilitator Shared | Unrelated participant | Deny | Deny | Absent | Implemented restrictive P |
| Facilitator Shared | Hub leader | Deny | Deny unless separately exact assigned facilitator + participant consent | Absent | Blocked sharing; role gives nothing P/C |
| Facilitator Shared | Course Creator | Deny | Deny unless separately exact assigned facilitator + participant consent | Absent | Blocked sharing; role gives nothing P/C/B |
| Facilitator Shared | Admin | Deny | Role gives no facilitator access; separately verified assignment/consent required | Absent | Blocked sharing; operational/result exceptions **OWNER APPROVAL REQUIRED** P/A |
| Facilitator Shared | Super Admin | Deny | Role gives no facilitator access; separately verified assignment/consent required | Absent | Blocked sharing; blanket results **OWNER APPROVAL REQUIRED** P/A |
| Facilitator Shared | Anonymous | Deny | Deny | No identity | Implemented P |
| Group Shared | Respondent | Allow | Allow own | Session owner | Implemented P/O |
| Group Shared | Assigned facilitator | Deny | Allow only if also authorized active member of that exact shared group + participant consent | Absent | Blocked group model P/C |
| Group Shared | Same-cohort participant | Deny | Allow only exact shared cohort/group membership + participant consent; a subgroup is not the whole cohort | Absent | Blocked group model P/C |
| Group Shared | Unrelated participant | Deny | Deny | Absent | Implemented restrictive P |
| Group Shared | Hub leader | Deny | No role grant; allow only independently exact shared-group membership + consent | Absent | Blocked group model P/H |
| Group Shared | Course Creator | Deny | No role grant; allow only independently exact shared-group membership + consent | Absent | Blocked group model P/B |
| Group Shared | Admin | Deny | No role grant; exact group membership + consent or separately approved exception | Absent | Blocked sharing; exception **OWNER APPROVAL REQUIRED** P/A |
| Group Shared | Super Admin | Deny | No role grant; exact group membership + consent or separately approved exception | Absent | Blocked sharing; exception **OWNER APPROVAL REQUIRED** P/A |
| Group Shared | Anonymous | Deny | Deny | No identity | Implemented P |

## Operational progress is a separate resource

**Verified from code:** body-sharing selection does not authorize progress endpoints, and progress access does not authorize content (A/J). This separate table applies identically to Private, Facilitator Shared and Group Shared. C is a response review loader, not a new operational progress API.

| Role | Current progress evidence | Desired operational policy (proposed) | Status |
| --- | --- | --- | --- |
| Respondent | Own dashboard/enrollment data (`lib/platform/dashboard.ts:25`) | Own progress | Existing code; browser/live deferred |
| Assigned facilitator | C verifies cohort assignment for review but supplies no response-body status once filtered; no separately verified progress endpoint in this review | Exact assigned cohort, minimal status/completion only | **OWNER APPROVAL REQUIRED**; endpoint verification/implementation deferred |
| Same-cohort participant | No grant inferred from cohort membership (P/C) | Own progress; others only approved aggregate, never individual by default | Proposed restriction |
| Unrelated participant | No reviewed other-person progress grant | Deny | Proposed restriction |
| Hub leader | Management helper is scoped to Hub, not a progress contract (`lib/platform/authorization.ts:104`) | Hub operational subset only if separately approved | **OWNER APPROVAL REQUIRED** |
| Course Creator | Authoring/preview scope; preview progress is synthetic (`lib/experiences/admin/preview.ts:28`) | No learner reporting from authoring role alone | **OWNER APPROVAL REQUIRED** |
| Admin | Global Journey and LMU status projections (A/J) | Explicit operational purpose/scope; retain existing summaries while deciding | **OWNER APPROVAL REQUIRED**; current summaries preserved |
| Super Admin | Same global operational paths (A/J) | Approved operational summaries; answer-derived results remain separate | **OWNER APPROVAL REQUIRED** |
| Anonymous | No reviewed progress grant | Deny | Proposed restriction |

## Decision and deny rules

**Verified from code:** fresh effective access rejects failed or malformed reads; ordinary deny overrides beat ordinary allows. Existing active-member Super Admin precedence bypasses those overrides (`lib/platform/effective-access.ts:23`; `lib/platform/effective-access-policy.ts:32`, `:41`). Direct course/Hub helpers use a separate authorization context and do not consume all effective-policy overrides (`lib/platform/authorization.ts:54`, `:58`). No new cache of permission grants was added.

**Proposed policy:** a body denial must occur before reading raw answers or snapshots. Sharing must not elevate a role or bypass account inactivity, revoked assignments, scope mismatch, password access, or explicit consent revocation. Require a unified tested revocation contract before future activation. Do not change the Super Admin override semantics silently; record the owner decision in [06](06-OPEN-OWNER-DECISIONS.md).
