export function participantCardEyebrow(configured: string | null, experienceType: string | null | undefined) {
  if (experienceType === "assessment") {
    if (!configured || /^(purposeos\s+)?assessment$/i.test(configured.trim())) return "Guided Experience";
    return configured;
  }
  if (configured) return configured;
  if (!experienceType) return null;
  return experienceType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
