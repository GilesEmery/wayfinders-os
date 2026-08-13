import { ExperienceCard } from "@/components/platform/ExperienceCard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformExperiences } from "@/lib/platform/experience-registry";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Experiences" };

export default function ExperiencesPage() {
  const experiences = getPlatformExperiences();

  return (
    <PlatformShell>
      <section className="platform-index">
        <header>
          <p className="platform-eyebrow">Experiences</p>
          <h1>Find the next step that fits your season.</h1>
        </header>
        <div className="platform-card-grid">
          {experiences.map((experience) => (
            <ExperienceCard experience={experience} key={experience.id} />
          ))}
        </div>
      </section>
    </PlatformShell>
  );
}
