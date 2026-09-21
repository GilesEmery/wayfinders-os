export function trainingCatalogActionLabel(signedIn: boolean, enrollmentStatus: string | null, admissionPolicy: string) {
  if (!signedIn) return "View Training";
  if (enrollmentStatus === "in_progress") return "Continue Training";
  if (enrollmentStatus) return "Open Training";
  return admissionPolicy === "open_enrollment" ? "View / Enroll" : "View Details";
}

export function trainingCatalogAccessLabel(signedIn: boolean, enrollmentStatus: string | null, admissionPolicy: string) {
  if (enrollmentStatus) return "Already in My Trainings";
  if (admissionPolicy === "open_enrollment") return signedIn ? "Open Enrollment" : "Sign in to enroll";
  return "Enrollment is assigned by Wayfinders staff";
}

export const TRAINING_CATALOG_EMPTY_MESSAGE = "No trainings are currently available to browse.";
