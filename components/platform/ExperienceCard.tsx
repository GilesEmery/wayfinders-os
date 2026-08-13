import type { PlatformExperienceDefinition } from "@/lib/platform/types";
import Link from "next/link";

export function ExperienceCard({ experience }: { experience: PlatformExperienceDefinition }) {
  return (
    <article className={`platform-experience-card brand-${experience.brandKey}`}>
      <p className="platform-card-type">{experience.type.replace("-", " ")}</p>
      <h2>{experience.title}</h2>
      <p>{experience.description}</p>
      <Link href={experience.href}>
        Explore {experience.title} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
