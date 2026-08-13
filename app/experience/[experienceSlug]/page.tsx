import { getCanonicalExperienceSlug } from "@/lib/experiences/lmu/experience-config";
import { notFound, permanentRedirect } from "next/navigation";

export default async function ExperiencePage({
  params,
}: PageProps<"/experience/[experienceSlug]">) {
  const { experienceSlug } = await params;
  const canonicalSlug = getCanonicalExperienceSlug(experienceSlug);
  if (!canonicalSlug) notFound();
  permanentRedirect(`/experiences/life-mapping-u/${canonicalSlug}`);
}
