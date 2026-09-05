import { LMUFooter } from "@/components/experiences/lmu/LMUFooter";
import { LMUHeader } from "@/components/experiences/lmu/LMUHeader";
import { LMUExperienceBadge } from "@/components/experiences/lmu/LMUExperienceBadge";
import { MapAccent } from "@/components/experiences/lmu/MapAccent";
import { PrimaryButton } from "@/components/experiences/lmu/PrimaryButton";
import { getPlatformUser } from "@/lib/platform/auth";
import { redirect } from "next/navigation";

export default async function LifeMappingUPage() {
  const user = await getPlatformUser();
  if (user) redirect("/experiences/life-mapping-u/original");

  return (
    <div className="landing-page">
      <LMUHeader context="A guided discovery process" theme="dark" />
      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow eyebrow-rule">Life Mapping U</p>
            <h1>Map what matters.<br />Move toward what is next.</h1>
            <p className="hero-accent">Your story is already pointing somewhere.</p>
            <p className="hero-copy">Life Mapping U helps you recognize the patterns already present in your story, clarify what matters most, and make thoughtful decisions about what comes next.</p>
            <PrimaryButton href="/experiences/life-mapping-u/original">Explore Life Mapping U</PrimaryButton>
          </div>
          <div className="hero-map-panel">
            <MapAccent variant={1} position="center" opacity={0.24} />
            <p className="map-meta">Life Mapping U / Orientation</p>
            <ol className="process-waypoints">
              <li className="waypoint-discover"><LMUExperienceBadge label="Discover waypoint" /><div><span>01</span><strong>Discover</strong><p>What has shaped me?</p></div></li>
              <li className="waypoint-clarify"><LMUExperienceBadge label="Clarify waypoint" /><div><span>02</span><strong>Clarify</strong><p>What matters most?</p></div></li>
              <li className="waypoint-forward"><LMUExperienceBadge label="Move forward waypoint" /><div><span>03</span><strong>Move forward</strong><p>What comes next?</p></div></li>
            </ol>
          </div>
        </section>
      </main>
      <LMUFooter />
    </div>
  );
}
