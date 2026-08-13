import { LMUShell } from "@/components/experiences/lmu/LMUShell";
import { MapAccent } from "@/components/experiences/lmu/MapAccent";
import { ModuleHeader } from "@/components/experiences/lmu/ModuleHeader";
import { SecondaryButton } from "@/components/experiences/lmu/SecondaryButton";
import { getAllModuleDefinitions, getModuleDefinition } from "@/lib/experiences/lmu/module-registry";
import { notFound } from "next/navigation";

export default async function ModulePage({ params }: PageProps<"/experiences/life-mapping-u/module/[moduleSlug]">) {
  const { moduleSlug } = await params;
  const moduleDefinition = getModuleDefinition(moduleSlug);
  if (!moduleDefinition) notFound();
  const allModules = getAllModuleDefinitions();
  const moduleNumber = allModules.findIndex((item) => item.id === moduleDefinition.id) + 1;

  return (
    <LMUShell context={moduleDefinition.shortTitle} theme="dark">
      <section className="module-layout">
        <div className="module-intro-panel"><ModuleHeader module={moduleDefinition} moduleNumber={moduleNumber} totalModules={allModules.length} /></div>
        <aside className="module-map-panel">
          <MapAccent variant={3} position="center" opacity={0.22} />
          <div className="coming-next">
            <p className="eyebrow">In development</p>
            <h2>Module build coming next</h2>
            <p>The guided exercise for this module will be created in the next phase. Nothing has been recorded and your progress has not changed.</p>
            <SecondaryButton href="/experiences/life-mapping-u">Return to overview</SecondaryButton>
          </div>
        </aside>
      </section>
    </LMUShell>
  );
}
