import { ExperienceCard } from "@/components/platform/ExperienceCard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformExperience } from "@/lib/platform/experience-registry";
import { AuthTrigger } from "@/components/platform/AuthTrigger";

export default function Home() {
  const lifeMappingU = getPlatformExperience("life-mapping-u");

  return (
    <PlatformShell>
      <section className="platform-hero">
        <p className="platform-eyebrow">Wayfinders</p>
        <h1>Find your way forward.</h1>
        <p>Explore guided experiences, tools, and resources designed to help you clarify what matters, grow with intention, and move toward meaningful action.</p>
        <AuthTrigger className="platform-button" destination="/experiences">Explore experiences <span aria-hidden="true">→</span></AuthTrigger>
      </section>
      {lifeMappingU && (
        <section className="platform-featured" aria-labelledby="featured-heading">
          <p className="platform-eyebrow" id="featured-heading">Featured experience</p>
          <ExperienceCard experience={lifeMappingU} />
        </section>
      )}
    </PlatformShell>
  );
}
