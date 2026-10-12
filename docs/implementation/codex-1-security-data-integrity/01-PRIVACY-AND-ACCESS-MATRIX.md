# Privacy and access matrix

This is an offline source inventory, not an inventory of deployed rows. The approved audiences are private, facilitator-shared and explicitly scoped group-shared. No new UI selector or database enum is introduced.

## Response metadata inventory

Migration `20260914190032_reconcile_a2_themes_privacy_delivery_plans.sql` permits these **independent raw/result visibility fields**: `participant_only`, `participant_and_facilitator`, `participant_and_leader`, `cohort_members`, `administrators`, `custom`. Sharing modes are `disabled`, `optional`, `required`. `visibility_settings` is JSON; no verified persisted response-level consent/cohort mechanism was found in the reviewed reader/writer paths.

| Existing value | CODEX 1 content behavior | Remaining mapping |
| --- | --- | --- |
| `participant_only` | Respondent only, independent of broader result settings | Unambiguous restrictive legacy semantics |
| `participant_and_facilitator` + `required` | Pure policy requires exact verified response cohort, active enrollment and respondent membership, assigned facilitator and current version; current adapter cannot establish response cohort and denies nonowners | Decide durable binding, participant disclosure and historic compatibility before activating |
| `participant_and_facilitator` + `optional` | Respondent only | Per-response opt-in is absent; enrollment is not consent |
| Any visibility + `disabled` | Respondent only | No automatic widening |
| `participant_and_leader`, `administrators`, `custom` | Respondent only | Ambiguous authority; neither maps automatically to an approved audience |
| `cohort_members` | Respondent only | Group identity, binding, pre-submission disclosure and explicit consent unresolved |
| Unknown/missing metadata | No nonowner content access | Review rather than guess |

The Circle of Influence migration, generic block response creation/duplication and the reviewed native draft-creation scripts use `participant_only` for both fields, `disabled` sharing and empty visibility settings. Version-clone migrations preserve existing values. None of those scripts or migrations was executed. **Actual historical row distributions and exceptions are unknown**, not assumed to match defaults. No mass rewrite is proposed.

## Viewer/content matrix

| Viewer | Private raw text/results | Facilitator-shared raw/results | Group-shared contents | Progress |
| --- | --- | --- | --- | --- |
| Anonymous | Deny | Deny | Deny | Existing public nonpersonal surfaces only |
| Respondent | Own content after fresh identity/password/ownership checks | Own content | Own content | Own progress |
| Assigned relevant facilitator | Deny private fields | Denied by current adapter pending durable scope; policy supports exact verified cohort, active authority and separate raw/result decisions | Disabled pending explicit group configuration/consent | Existing authorized summaries; no permission inferred for text |
| Fellow cohort member | Deny | Deny | Disabled pending explicit scope/consent | Existing permitted summaries only |
| Other cohort/Hub, revoked facilitator or withdrawn member | Deny | Deny | Deny | Existing scope checks |
| Global Admin/Super Admin, creator or Hub leader | No content exception solely from role/interface | Must independently meet sharing conditions; currently unavailable | Disabled | Existing operational completion summaries retained |

Owner history remains available through existing ownership/password paths. Nonowner historical/archived and embedded assessment bodies are not read: current membership cannot prove historical sharing scope. Sharing of results never automatically authorizes raw answers, notes or attachments.

## Confirmed content paths and enforcement

| Path / source | Server boundary |
| --- | --- |
| `app/api/cohorts/[cohortId]/members/[participantId]/responses/route.ts`, full/outline/box reads | `loadCohortMemberResponses`: fresh identity, current assignments/membership, respondent active membership, enrollment/course/offering; definitions filtered before answer query. No-store route. |
| `lib/platform/response-library.ts` own library | Respondent resolved from session, participant/enrollment query predicates and password checks; request-local deduplication only |
| `lib/admin/wayfinders/journey.ts`, CRM record detail | `loadAdminJourneyResponses` now requires admin identity **and respondent ownership** before private queries; ordinary Journey completion projection stays operational |
| `app/api/admin/wayfinders/[participantId]/export/route.ts` | `exportWayfinder` checks respondent ownership before all raw/result/history/Companion/personal-note source reads; existing audited export retained for eligible owner-admin |
| `lib/assessment-results.ts`, `/account/results/[kind]/[resultId]` and `/admin/users/[userId]/results/[kind]/[resultId]` | Both exported loaders now resolve session participant; an admin URL cannot supply another participant and bypass ownership |
| `/admin/life-mapping-u/[assessmentId]` | Progress and assessment metadata remain operational; `lmu_results` queried only for the respondent |
| `/api/lmu/assessment`, LMU draft/finalize/reset routes | Existing `resolveAuthenticatedParticipant` binds assessment to session participant; custom model retained |
| Native assessment pages and generic participant runtime | Existing session participant, enrollment/version, password and exact block/definition checks; own responses only |
| Companion notebook and personal notes | Existing participant/enrollment predicates; excluded from unrelated admin export. Facilitator notes, chat and operational CRM notes are separate domains and unchanged. |
| Course/Companion resource signing | Instructional assets, not response attachments. Existing delivery/audience/authorized course resolution applies. No separate response-upload attachment retrieval endpoint found in these reviewed response paths. No broader Storage policy change made. |

Privileged query clients bypass RLS, so these ownership/visibility checks are required at the server boundary. No shared answer/authorization cache was added. Existing successful-read grants are recomputed per operation; revocation applies to subsequent reads, not already downloaded material. Full live-policy verification remains pending.

## Hub directory: proposal only

Current `/hubs/[hubSlug]` queries active member names for **any signed-in user**, while profile links require `wayfinder.view`. Hiding profile links does not protect the names. Behavior unchanged except unavailable authorization feedback.

| Viewer | Public active Hub description | Proposed member names | Proposed profile/contact |
| --- | --- | --- | --- |
| Anonymous | Allow | Deny | Deny |
| Signed-in nonmember | Allow | Deny | Deny |
| Active Hub member | Allow | Allow in own Hub | Separate scoped permission |
| Active leader | Allow | Allow in led Hub | Existing scoped `wayfinder.view` |
| Admin/Super Admin | Allow | Operational access | Existing admin/profile authority |

Alternate name surfaces: `/hubs/[hubSlug]/members/[participantId]` (effective permission plus target Hub membership); `app/admin/cohorts/[cohortId]/page.tsx`, admin users/organizations/Hubs screens (admin); training learner-search API (admin plus course-admin check); cohort-response name header (review-entry gate); Companion member/message-author lists in `lib/experiences/builder/companion-data.ts` and the Companion API (resolved delivery and active membership context). Public Hub descriptions are distinct from member names. Do not expand the directory proposal to chat attribution, roster operations or private contact details without review.

## Creator authority: current and proposed

| Role alone | Current create/edit/preview/publish | Proposed least privilege, not implemented |
| --- | --- | --- |
| Member | No | Own participation only |
| Course Creator | Catalog permissions support create/owned/assigned edit; global `requireAdmin()` still blocks authoring entry | Create own draft, edit/preview owned or explicitly assigned course; no default publish |
| Hub Leader | No course authoring solely from this role | Hub operations only unless separately assigned creator rights |
| Admin | Global authoring and publication via current authorization | Existing operations; private responses still separate |
| Super Admin | Global authoring/publication and protected administration | Existing authority; explicit operational private-content policy still needed |

Exact guard locations include `mutations.ts` create/update, `curriculum-mutations.ts`, `layout-mutations.ts`, `block-mutations.ts`, `preview.ts`, `companion-reconciliation.ts`, and `version-release.ts` clone/publish under `lib/experiences/admin/`. Build checks recognize `course_builder`/`course_admin`; publication recognizes `course_admin` or global administration. `course_creator` catalog permissions are not equivalent to those scoped roles. Global guards were not removed. Proposed tests: owned/assigned/unrelated course, unrelated Hub, explicit revocation, draft-only edit, preview without real responses, and distinct publisher authority.
