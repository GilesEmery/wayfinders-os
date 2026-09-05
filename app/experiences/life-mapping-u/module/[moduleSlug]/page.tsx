import { LMUShell } from "@/components/experiences/lmu/LMUShell";
import { LifeMapPlaceholder } from "@/components/experiences/lmu/LifeMapPlaceholder";
import { MapAccent } from "@/components/experiences/lmu/MapAccent";
import { ModuleHeader } from "@/components/experiences/lmu/ModuleHeader";
import { DevelopmentCompletionControl } from "@/components/experiences/lmu/DevelopmentCompletionControl";
import { FinishModuleButton } from "@/components/experiences/lmu/FinishModuleButton";
import { SuccessStoriesModule } from "@/components/experiences/lmu/SuccessStoriesModule";
import { TransferableSkillsModule } from "@/components/experiences/lmu/TransferableSkillsModule";
import { SupervisorModule, TeammatesModule } from "@/components/experiences/lmu/TeammatesModule";
import { ValuesModule } from "@/components/experiences/lmu/ValuesModule";
import { GrowthModule } from "@/components/experiences/lmu/GrowthModule";
import { LocationModule } from "@/components/experiences/lmu/LocationModule";
import { XFactorModule } from "@/components/experiences/lmu/XFactorModule";
import { SalaryModule } from "@/components/experiences/lmu/SalaryModule";
import { MotivatorRankingsModule } from "@/components/experiences/lmu/MotivatorRankingsModule";
import { ModuleStartOverControl } from "@/components/experiences/lmu/ModuleStartOverControl";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getAllModuleDefinitions, getModuleDefinition } from "@/lib/experiences/lmu/module-registry";
import { notFound } from "next/navigation";

export default async function ModulePage({ params }: PageProps<"/experiences/life-mapping-u/module/[moduleSlug]">) {
  const { moduleSlug } = await params;
  const moduleDefinition = getModuleDefinition(moduleSlug);
  if (!moduleDefinition) notFound();
  if (moduleDefinition.id === "success-stories") {
    return <SuccessStoriesModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "transferable-skills") {
    return <TransferableSkillsModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "teammates") {
    return <TeammatesModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "supervisor") {
    return <SupervisorModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "values") {
    return <ValuesModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "growth") {
    return <GrowthModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "location") {
    return <LocationModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "x-factor") {
    return <XFactorModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "salary") {
    return <SalaryModule media={moduleDefinition.instructionalMedia} />;
  }
  if (moduleDefinition.id === "current-motivator-rankings") {
    return <MotivatorRankingsModule />;
  }
  if (moduleDefinition.kind === "result") {
    return <LifeMapPlaceholder module={moduleDefinition} />;
  }
  const allModules = getAllModuleDefinitions();
  const moduleNumber = allModules.findIndex((item) => item.id === moduleDefinition.id) + 1;

  return (
    <LMUShell context={moduleDefinition.shortTitle} theme="dark" journeyHref="/experiences/life-mapping-u/original/modules">
      <section className="module-layout">
        <div className="module-intro-panel"><ModuleHeader module={moduleDefinition} moduleNumber={moduleNumber} totalModules={allModules.length} /></div>
        <aside className="module-map-panel">
          <MapAccent variant={3} position="center" opacity={0.22} />
          <div className="coming-next">
            <p className="eyebrow">In development</p>
            <h2>Module build coming next</h2>
            <p>The guided exercise for this module will be created in the next phase. Nothing has been recorded and your progress has not changed.</p>
            {moduleDefinition.id !== "student-priority-map" && <DevelopmentCompletionControl moduleId={moduleDefinition.id} />}
            <FinishModuleButton />
            <ModuleStartOverControl experienceId={LMU_ORIGINAL_EXPERIENCE_ID} moduleHref={`/experiences/life-mapping-u/module/${moduleDefinition.slug}`} moduleId={moduleDefinition.id} />
          </div>
        </aside>
      </section>
    </LMUShell>
  );
}
