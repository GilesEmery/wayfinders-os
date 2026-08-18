import type { LMUExperienceDefinition } from "@/lib/experiences/lmu/types";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import { getExperienceModules } from "@/lib/experiences/lmu/experience-config";
import { LMUJourney } from "./LMUJourney";
import { ModuleJourneyItem } from "./ModuleJourneyItem";
import { ModuleProgress } from "./ModuleProgress";
import { ModuleCompletionStat } from "./ModuleCompletionStat";
import { calculateModuleProgress } from "@/lib/experiences/lmu/experience-config";

export function ExperienceScreen({ experience }: { experience: LMUExperienceDefinition }) {
  const modules = getExperienceModules(experience);
  const discoveryModules = modules.filter((module) => module.kind !== "result");
  const discoveryModuleIds = discoveryModules.map((module) => module.id);
  const initialProgress = calculateModuleProgress(discoveryModuleIds);

  return (
    <LMUShell context={experience.title} theme="dark">
      <section className="experience-hero">
        <div className="experience-title-block">
          <p className="eyebrow eyebrow-rule">{experience.shortTitle} experience</p>
          <h1>{experience.title}</h1>
          <p className="experience-lead">{experience.description}</p>
          <dl className="experience-stats">
            <div><dt>Modules</dt><dd>{discoveryModules.length}</dd></div>
            <div><dt>Modules completed</dt><ModuleCompletionStat experienceId={experience.id} moduleIds={discoveryModuleIds} /></div>
          </dl>
        </div>
        <div className="experience-map-panel">
          <MapAccent variant={2} position="center" opacity={0.2} />
          <span className="map-panel-label">Your module journey</span>
        </div>
      </section>
      <section className="experience-plan">
        {experience.id === "life-mapping-u-original" ? <LMUJourney experience={experience} /> : (
          <>
            <div className="plan-heading"><div><p className="eyebrow">Your path</p><h2>A framework for discovery</h2></div><ModuleProgress progress={initialProgress} /></div>
            <ol className="module-list">{modules.map((module, index) => <ModuleJourneyItem index={index} key={module.id} module={module} status={index === 0 ? "available" : "locked"} />)}</ol>
          </>
        )}
      </section>
    </LMUShell>
  );
}
