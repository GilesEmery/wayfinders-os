// Pure policy; callers must supply fresh, server-verified identity and scope.
// Generic group sharing requires persisted consent. Cohort-only review follows
// the owner-approved facilitator policy with fresh server scope checks.
export type ResponseAudience = {
  viewerParticipantId: string | null;
  respondentParticipantId: string;
  cohortId?: string | null;
  experienceId?: string | null;
  // Durable sharing scope, never an enrollment compatibility pointer.
  responseCohortId?: string | null;
  enrollmentExperienceId?: string | null;
  activeEnrollment?: boolean;
  activeRespondentMembership?: boolean;
  assignedFacilitator?: boolean;
  currentVersion?: boolean;
  // Fresh, durable participant opt-in for this content kind and exact scope.
  // A definition's required share mode is never consent on its own.
  participantSharingConfirmed?: boolean;
  // Owner-approved cohort review, established from fresh membership, offering,
  // enrollment and version checks by the cohort-only server loader.
  cohortReviewAuthorized?: boolean;
};
export type ResponseVisibility = { raw_visibility: string; result_visibility: string; share_mode: string };

export function canReadResponseContent(audience: ResponseAudience, definition: ResponseVisibility | null, kind: "raw" | "result") {
  if (!audience.viewerParticipantId) return false;
  if (audience.viewerParticipantId === audience.respondentParticipantId) return true;
  if (definition && audience.cohortReviewAuthorized === true) {
    return Boolean(audience.cohortId && audience.experienceId
      && audience.enrollmentExperienceId === audience.experienceId
      && audience.activeEnrollment && audience.activeRespondentMembership
      && audience.assignedFacilitator && audience.currentVersion);
  }
  if (!definition || definition.share_mode !== "required") return false;
  if (audience.participantSharingConfirmed !== true) return false;
  const visibility = kind === "raw" ? definition.raw_visibility : definition.result_visibility;
  // optional sharing has no persisted per-response opt-in; disabled is restrictive.
  if (visibility !== "participant_and_facilitator") return false;
  return Boolean(audience.cohortId && audience.experienceId
    && audience.responseCohortId === audience.cohortId
    && audience.enrollmentExperienceId === audience.experienceId
    && audience.activeEnrollment && audience.activeRespondentMembership
    && audience.assignedFacilitator && audience.currentVersion);
}

export function responsePrivacyDisclosure(definition: ResponseVisibility) {
  return definition.share_mode === "required" && definition.raw_visibility === "participant_and_facilitator"
    ? "Outside cohort review, facilitator sharing requires verified consent and scope. PurposeOS administrators can review responses and results; cohort facilitators can review their cohort’s course work. Personal notes stay private."
    : "Your response is available to you and authorized reviewers. PurposeOS administrators can review responses and results; cohort facilitators can review their cohort’s course work. Personal notes stay private.";
}
