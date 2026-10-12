# Open owner decisions

The three content-sharing audiences are already approved; these questions concern scope, legacy mapping and other policies, not reapproval of those audiences.

| Decision | Recommended default | Consequence / approval needed |
| --- | --- | --- |
| Hub directory names | Public Hub description; names only to active members/assigned leaders and operational admins; profile/contact separately permissioned | Current signed-in nonmember visibility remains unchanged. Approve the matrix in 01 before implementing a behavior change, including alternate roster/name paths. |
| Scoped creator authority | Member/Hub leader gain no implicit authoring; Course Creator can create/edit/preview owned or explicitly assigned drafts; publish requires separate authority | Global guards remain. Approve role mapping (`course_creator` versus `course_builder`/`course_admin`), ownership/organization scope and who can publish before changing them. |
| Durable facilitator/group sharing and historical mapping | Bind each shared response to an explicit cohort/activity scope; require documented pre-submission disclosure and group consent; ambiguous history stays private | Current response model cannot establish durable sharing scope; legacy enrollment pointers are not authority. Confirm cohort-specific versus experience-wide facilitator audiences and which activities are explicitly group-shared. Decide legacy `optional`, leader, administrator and custom settings only after metadata inventory. No retroactive enrollment-as-consent mapping. Sharing stays unavailable meanwhile. |
| Privileged operational content exceptions | No ordinary admin/facilitator private-content exception. If needed, narrowly assigned purpose-specific access with reason, expiry and mandatory audited reads/exports | Unrelated-admin CSV, Journey answer detail, LMU results and shared assessment-result URLs now deny private content. Specify legitimate cases, authorized roles, exact data types and oversight before an exception is implemented. Progress summaries are separate. |

No directory or creator rollout is included. Review these decisions and the CODEX 1 diff before any separately authorized integration/deployment work.
