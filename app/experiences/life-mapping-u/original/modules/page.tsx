import { ExperienceScreen } from "@/components/experiences/lmu/ExperienceScreen";
import { getExperienceDefinition } from "@/lib/experiences/lmu/experience-config";
import { notFound } from "next/navigation";

export default function OriginalExperienceModulesPage() {
  const experience = getExperienceDefinition("original");
  if (!experience) notFound();
  return <ExperienceScreen experience={experience} />;
}
