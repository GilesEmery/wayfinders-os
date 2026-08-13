import { calculateModuleProgress, getExperienceModules } from "@/lib/experiences/lmu/experience-config";
import type { LMUExperienceDefinition } from "@/lib/experiences/lmu/types";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import { ModuleJourneyItem } from "./ModuleJourneyItem";
import { ModuleProgress } from "./ModuleProgress";
import { PrimaryButton } from "./PrimaryButton";

export function ExperienceScreen({ experience }: { experience: LMUExperienceDefinition }) {
  const modules = getExperienceModules(experience);
  const progress = calculateModuleProgress(modules.map((module) => module.id));

  return (
    <LMUShell context={experience.title} theme="dark">
      <section className="experience-hero">
        <div className="experience-title-block">
          <p className="eyebrow eyebrow-rule">{experience.shortTitle} experience</p>
          <h1>{experience.title}</h1>
          <p className="experience-lead">{experience.description}</p>
          <dl className="experience-stats">
            <div><dt>Modules</dt><dd>{modules.length}</dd></div>
            <div><dt>Complete</dt><dd>{progress.percentage}%</dd></div>
          </dl>
        </div>
        <div className="experience-map-panel">
          <MapAccent variant={2} position="center" opacity={0.2} />
          <span className="map-panel-label">Your module journey</span>
        </div>
      </section>
      <section className="experience-plan">
        <div className="plan-heading">
          <div><p className="eyebrow">Your path</p><h2>A framework for discovery</h2></div>
          <ModuleProgress progress={progress} />
        </div>
        <ol className="module-list">
          {modules.map((module, index) => <ModuleJourneyItem index={index} key={module.id} module={module} status={index === 0 ? "available" : "locked"} />)}
        </ol>
        {modules[0] && (
          <div className="plan-action">
            <PrimaryButton href={`/experiences/life-mapping-u/module/${modules[0].slug}`}>Begin experience</PrimaryButton>
            <p>Progress begins when you take action inside a module.</p>
          </div>
        )}
      </section>
    </LMUShell>
  );
}
