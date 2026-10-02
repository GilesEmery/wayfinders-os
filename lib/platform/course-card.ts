import { normalizeCourseConfiguration } from "@/lib/experiences/builder/course-configuration";
import { participantCardEyebrow } from "@/lib/platform/course-card-policy";

export type CourseCardDisplay = Readonly<{
  imageUrl: string | null;
  headline: string;
  supportingText: string | null;
  eyebrow: string | null;
}>;

export function resolveCourseCard(input: {
  configuration: unknown;
  courseTitle: string;
  courseDescription?: string | null;
  experienceType?: string | null;
  cardImageUrl?: string | null;
  coverImageUrl?: string | null;
}): CourseCardDisplay {
  const card = normalizeCourseConfiguration(input.configuration).card;
  return {
    imageUrl: input.cardImageUrl || input.coverImageUrl || null,
    headline: card.headline || input.courseTitle,
    supportingText: card.supporting_text || input.courseDescription?.trim() || null,
    eyebrow: participantCardEyebrow(card.eyebrow, input.experienceType),
  };
}
