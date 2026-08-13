import { ExperienceScreen } from "@/components/experiences/lmu/ExperienceScreen";
import { getExperienceDefinition } from "@/lib/experiences/lmu/experience-config";
import { notFound } from "next/navigation";

export default function SeniorsExperiencePage() {
  const experience = getExperienceDefinition("seniors");
  if (!experience) notFound();
  return <ExperienceScreen experience={experience} />;
}
