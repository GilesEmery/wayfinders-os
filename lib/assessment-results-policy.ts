import { activatePurposeComplete, normalizeActivatePurposeAnswers } from "./experiences/builder/activate-purpose-assessment.ts";
import { ethosComplete, normalizeEthosAnswers } from "./experiences/builder/ethos-assessment.ts";
import { launchingHubComplete, normalizeLaunchingHubAnswers } from "./experiences/builder/launching-wayfinders-hub-assessment.ts";
export const NATIVE_ASSESSMENT_RESULTS = {
  activate_your_purpose_assessment: { kind: "activate-your-purpose", name: "Activate Your Purpose" },
  wayfinders_ethos_assessment: { kind: "wayfinders-ethos", name: "Wayfinders Ethos Reflection" },
  launching_wayfinders_hub_assessment: { kind: "launching-your-wayfinders-hub", name: "Launching Your Wayfinders Hub" },
} as const;
import { normalizePersonalImpactEnvelope, PERSONAL_IMPACT_RESPONSE_KEY } from "./experiences/builder/personal-impact-statement.ts";
import { normalizeStartSomethingEnvelope, START_SOMETHING_RESPONSE_KEY } from "./experiences/builder/start-something.ts";

export function completedGenericResult(responseKey: string, responseData: unknown, finalizedAt: string | null) {
  if (responseKey === PERSONAL_IMPACT_RESPONSE_KEY) {
    const finished = normalizePersonalImpactEnvelope(responseData, finalizedAt).finished;
    return finished ? { kind: "personal-impact-statement" as const, name: "Personal Impact Statement", completedAt: finished.completedAt, data: finished.participantMaterial } : null;
  }
  if (responseKey === START_SOMETHING_RESPONSE_KEY) {
    const finished = normalizeStartSomethingEnvelope(responseData).finished;
    return finished ? { kind: "start-something" as const, name: "Start Something", completedAt: finished.completedAt, data: finished.participantMaterial } : null;
  }
  const native = NATIVE_ASSESSMENT_RESULTS[responseKey as keyof typeof NATIVE_ASSESSMENT_RESULTS];
  const finished = (responseData as { finished?: { completedAt?: string; answers?: unknown } } | null)?.finished;
  if (!native || !finished?.completedAt || !finalizedAt || finished.completedAt !== finalizedAt) return null;
  const complete = native.kind === "activate-your-purpose" ? activatePurposeComplete(normalizeActivatePurposeAnswers(finished.answers)) : native.kind === "wayfinders-ethos" ? ethosComplete(normalizeEthosAnswers(finished.answers)) : launchingHubComplete(normalizeLaunchingHubAnswers(finished.answers));
  return complete ? { ...native, completedAt: finished.completedAt, data: finished.answers } : null;
}

export function completedLegacyActivatePurpose(responseKey: string, responseData: unknown, finalizedAt: string | null) {
  const data = responseData as { answers?: unknown; finished?: unknown } | null;
  if (responseKey !== "activate_your_purpose_assessment" || data?.finished || !finalizedAt || !Number.isFinite(Date.parse(finalizedAt))) return null;
  const answers = normalizeActivatePurposeAnswers(data?.answers);
  return activatePurposeComplete(answers) ? { kind: "activate-your-purpose" as const, name: "Activate Your Purpose", completedAt: finalizedAt, data: answers } : null;
}
