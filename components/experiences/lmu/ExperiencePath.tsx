import type { LMUExperienceDefinition } from "@/lib/experiences/lmu/types";
import Link from "next/link";
import { LMULogo } from "./LMULogo";

interface ExperiencePathProps {
  experience: LMUExperienceDefinition;
  index: number;
}

export function ExperiencePath({ experience, index }: ExperiencePathProps) {
  return (
    <Link
      className="experience-path"
      href={`/experiences/life-mapping-u/${experience.slug}`}
    >
      <div className="path-identity">
        <span className="path-number">{String(index + 1).padStart(2, "0")}</span>
        <LMULogo variant="mark" />
      </div>
      <div className="path-copy">
        <h3>{experience.title}</h3>
        <p>{experience.description}</p>
      </div>
      <span className="path-action">
        Explore <span aria-hidden="true">↗</span>
      </span>
    </Link>
  );
}
