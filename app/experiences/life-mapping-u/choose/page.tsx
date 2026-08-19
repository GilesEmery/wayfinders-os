import Link from "next/link";
import { LMUFooter } from "@/components/experiences/lmu/LMUFooter";
import { LMUHeader } from "@/components/experiences/lmu/LMUHeader";
import { LMUExperienceBadge } from "@/components/experiences/lmu/LMUExperienceBadge";
import { SecondaryButton } from "@/components/experiences/lmu/SecondaryButton";
import { experiences } from "@/lib/experiences/lmu/experiences";

export default function LifeMappingUChoosePage() {
  const [original, student, emptyNesters] = experiences;
  return <div className="landing-page lmu-front-door-page">
    <LMUHeader context="Choose your experience" theme="dark" />
    <main className="lmu-choose-main">
      <header className="lmu-choose-heading"><p className="eyebrow eyebrow-rule">Life Mapping U</p><h1>Choose your Life Mapping U experience</h1><p>Life Mapping U is designed for different seasons of life. Choose the experience that best fits where you are now.</p></header>
      <section className="lmu-experience-options" aria-label="Life Mapping U experiences">
        <Link className="lmu-experience-option is-active" href="/experiences/life-mapping-u/original">
          <LMUExperienceBadge label="Life Mapping U" size={66} />
          <div><span className="eyebrow">Available now</span><h2>{original.title}</h2><p>{original.description}</p><strong>Begin Life Mapping U <span aria-hidden="true">→</span></strong></div>
        </Link>
        <div className="lmu-experience-option is-coming" aria-disabled="true" role="group">
          <LMUExperienceBadge label="LMU Student, coming soon" state="coming-soon" size={66} />
          <div><span className="eyebrow">Coming Soon</span><h2>{student.title}</h2><p>{student.description}</p></div>
        </div>
        <div className="lmu-experience-option is-coming" aria-disabled="true" role="group">
          <LMUExperienceBadge label="LMU Empty Nesters, coming soon" state="coming-soon" size={66} />
          <div><span className="eyebrow">Coming Soon</span><h2>{emptyNesters.title}</h2><p>{emptyNesters.description}</p></div>
        </div>
      </section>
      <SecondaryButton href="/experiences/life-mapping-u/start">Back</SecondaryButton>
    </main>
    <LMUFooter />
  </div>;
}
