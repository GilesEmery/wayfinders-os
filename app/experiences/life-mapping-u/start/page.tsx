import { LMUFooter } from "@/components/experiences/lmu/LMUFooter";
import { LMUHeader } from "@/components/experiences/lmu/LMUHeader";
import { MapAccent } from "@/components/experiences/lmu/MapAccent";
import { ParticipantEntryForm } from "@/components/experiences/lmu/ParticipantEntryForm";
import { SecondaryButton } from "@/components/experiences/lmu/SecondaryButton";

export default function LifeMappingUStartPage() {
  return <div className="landing-page lmu-front-door-page">
    <LMUHeader context="Participant welcome" theme="dark" />
    <main className="lmu-entry-layout">
      <section className="lmu-front-door-copy">
        <p className="eyebrow eyebrow-rule">Life Mapping U</p>
        <h1>Welcome to Life Mapping U</h1>
        <p className="lmu-front-door-lede">Create or sign in to your Wayfinders OS account to continue into Life Mapping U.</p>
        <ParticipantEntryForm />
        <SecondaryButton href="/experiences/life-mapping-u">Back</SecondaryButton>
      </section>
      <aside className="lmu-front-door-map" aria-hidden="true"><MapAccent density="tight" position="center" opacity={0.2} /></aside>
    </main>
    <LMUFooter />
  </div>;
}
