import { ExperienceCard } from "@/components/platform/ExperienceCard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getCanonicalPublicExperiences } from "@/lib/platform/canonical-experience-registry";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Experiences" };

export default async function ExperiencesPage() {
  const experiences = await getCanonicalPublicExperiences();

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
