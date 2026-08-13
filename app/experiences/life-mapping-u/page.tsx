import { ExperiencePath } from "@/components/experiences/lmu/ExperiencePath";
import { LMUFooter } from "@/components/experiences/lmu/LMUFooter";
import { LMUHeader } from "@/components/experiences/lmu/LMUHeader";
import { MapAccent } from "@/components/experiences/lmu/MapAccent";
import { PrimaryButton } from "@/components/experiences/lmu/PrimaryButton";
import { SectionIntro } from "@/components/experiences/lmu/SectionIntro";
import { experiences } from "@/lib/experiences/lmu/experiences";

export default function LifeMappingUPage() {
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
            <PrimaryButton href="#experiences">Explore Life Mapping U</PrimaryButton>
          </div>
          <div className="hero-map-panel">
            <MapAccent variant={1} position="center" opacity={0.24} />
            <p className="map-meta">Life Mapping U / Orientation</p>
            <ol className="process-markers">
              <li><span>01</span><div><strong>Discover</strong><p>What has shaped me?</p></div></li>
              <li className="active"><span>02</span><div><strong>Clarify</strong><p>What matters most?</p></div></li>
              <li><span>03</span><div><strong>Move forward</strong><p>What comes next?</p></div></li>
            </ol>
          </div>
        </section>
      </main>
      <section className="experiences-section" id="experiences">
        <SectionIntro eyebrow="One framework" title={<>Different<br />journeys.</>} copy="Life Mapping U can be experienced in different ways depending on season of life, context, and purpose. The framework remains connected while individual modules adapt to the experience." />
        <div className="experience-paths">
          {experiences.map((experience, index) => <ExperiencePath experience={experience} index={index} key={experience.id} />)}
        </div>
      </section>
      <LMUFooter />
    </div>
  );
}
