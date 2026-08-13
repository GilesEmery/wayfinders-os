import { ExperienceScreen } from "@/components/experiences/lmu/ExperienceScreen";
import { getExperienceDefinition } from "@/lib/experiences/lmu/experience-config";
import { notFound } from "next/navigation";

export default function StudentExperiencePage() {
  const experience = getExperienceDefinition("student");
  if (!experience) notFound();
  return <ExperienceScreen experience={experience} />;
}
