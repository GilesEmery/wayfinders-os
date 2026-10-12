# Policy and access verification

Local source review and isolated tests only. Payload checks mean projected query/DTO/CSV fields inspected and fakes verified; actual RSC/API payloads remain a live gate. IDs are linkable operational identifiers, not anonymous data.

| Approved policy | Release implementation / evidence |
| --- | --- |
| D1 Operational authority | `lib/admin/wayfinders/journey.ts` fresh global admin; completion-only history projection; no detail selector for metadata CSV. `lib/admin/wayfinders/operational-export.ts` whitelists IDs, kind, course/assessment label, status, dates, version, historical flag, then checked audit. Scoped cohort reporting stays unavailable; legacy enrollment pointers are not scope. |
| D2 Private interpreted results | `lib/assessment-results.ts` fresh session/participant owner before queries; admin results page delegates to that loader. LMU admin detail checks respondent ownership before `lmu_results`. No Super Admin/private exception. |
| D3 Directory / contacts | `lib/platform/hub-directory.ts` matching fresh identity, complete effective access, exact active membership or exact leader, explicit directory deny, complete roster/names. `app/hubs/[hubSlug]/page.tsx` receives names only after gate. Contact profile route separately requires exact-Hub explicit `wayfinder.view` allow and rejects applicable deny before active target membership/PII query. Global role alone is insufficient. |
| D4 Course Creator | Authoring mutations/preview/release retain global admin entry plus builder/admin scope checks. Creator alone cannot enter; no inference from `created_by` or organization provenance. Publish/enrollment/reporting are not newly granted. |
| D5 Sharing | `response-sharing-policy.ts` requires revision consent and exact context; real adapter supplies neither durable proof nor binding, so nonowner bodies stay denied. Nonowner archived/embedded snapshots are excluded before query. Group sharing stays disabled. |
| D6 Private exports | `export.ts` respondent ownership before bodies; default CSV route remains private, `?view=operational` separate. Both successful exports require checked audit; route no-store/nosniff and generic errors. |
| D7 Aggregates | LMU list status/completion totals only; no name/email join, interpreted-result aggregate, free text, drill-through or new small-group engine. Exact counts reject partial collections; analytics page remains a placeholder. No invented privacy threshold. |
| D8 Prerequisites / precedence | `authorization.ts` and `effective-access.ts` check transport/errors, roles/scopes/effects and exact-count completeness. Pure general Super Admin precedence retained after successful prerequisites. Independent private gates, contact/directory denies and owner identity restrictions still apply. |

| Entry point | Boundary / response |
| --- | --- |
| `/hubs/[hubSlug]` | Directory minimal ID/full_name/first_name only after directory gate; client receives no denied roster. Hub description/offerings behavior preserved; closed-Hub discoverability is deferred. |
| `/hubs/[hubSlug]/members/[participantId]` | Explicit exact-Hub contact authority + active target; profile/contact fields intentionally returned only there. |
| `/admin/users/[userId]` + Journey API | Existing global CRM authority can see CRM contact records in that separately privileged domain; operational Journey has no contact/body fields and checked audit. Expanding a Journey detail cannot bypass owner-only loader. CRM is not represented as anonymous reporting. |
| `/admin/users/[userId]/results/[kind]/[resultId]` | Owner loader; nonowner unavailable, including Super Admin. |
| `/admin/life-mapping-u` and `/admin/assessments/life-mapping-u` alias | Global operational IDs/status/completion/dates; complete reads and checked audit. |
| LMU admin detail and alias | Operational section progress; private result query only owner; checked audit before render. |
| `/api/admin/wayfinders/[participantId]/export` | UUID and view validation; owner private CSV or global metadata CSV; mandatory audit. |
| Cohort response API / `loadCohortMemberResponses` | Exact active review context; no nonowner bodies/history/embedded results until consent/context contract exists. |
| Own response library / account results | Fresh respondent authority; owner access retained in isolated tests. Password gates retained; no new role exemption. |
| Generic response/progress actions | Fresh authorized runtime, expected rendered revision, CAS/duplicate conflict; no acknowledged success after failed required progress. |
| `/api/lmu/sections/[sectionKey]` PUT/DELETE and finalize POST | Fresh authenticated owner/password context; mandatory captured assessment header equal to resolved ID before mutations. Header is not authorization and does not select another owner's row. Missing/old forms get 409 and must reload. |
| Resource signing / authoring | Participant runtime authorizes enrollment/delivery before `resolveCourseAssets`; authoring retains admin guards. Resource copier validates source course/library association. Signing helper itself is not an authorization boundary; approved catalog card assets are also signed by catalog/dashboard callers. 15-minute URLs cannot be recalled by code rollback. |
| Clone/publish/order | Fresh authoring/publish guards; RPC plus follow-up failures reported truthfully. No private preview data or new creator grants. |

| Role | Own private content | Other private content | Directory names / contacts | Global operational metadata | Authoring |
| --- | --- | --- | --- | --- | --- |
| Respondent / member | Yes, existing owner paths | Deny | Exact active member names; explicit contact permission separately | Deny | Deny |
| Exact Hub leader | Own only | Deny | Exact assigned leader names; contacts require explicit override; inactive membership/deny restricts | No global report; scoped attribution deferred | No implicit grant |
| Assigned facilitator | Own only | Deny; sharing deferred | No Hub grant solely from cohort assignment | Scoped reporting deferred | No implicit grant |
| Course Creator | Own only | Deny | Membership/contact rules unchanged | Deny | Scoped creator entry deferred/denied |
| Admin | Own only | Deny | No directory/contact grant from global role alone | Yes, audited | Existing global administration |
| Super Admin | Own only | Deny | Independent membership/explicit contact/deny gates | Yes, audited | Existing general precedence after prerequisites |
| Anonymous | Deny | Deny | Deny roster/contact | Deny | Deny |
| Revoked / failed identity | Deny restricted path | Deny | Revoked membership/assignment/allow denied; failed reads unavailable | Revoked admin denied | Revoked admin denied |

Withdrawal from a cohort/Hub does not erase respondent ownership of historical answers. Offline negative cases cover identity/scope/revocation/read failures; actual role sessions, direct Data API, RSC payloads, signing and grant revocation require the bounded owner gate.
