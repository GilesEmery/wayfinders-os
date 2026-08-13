import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

interface ModuleHeaderProps {
  module: LMUModuleDefinition;
  moduleNumber: number;
  totalModules: number;
}

export function ModuleHeader({ module, moduleNumber, totalModules }: ModuleHeaderProps) {
  return (
    <header className="module-header">
      <div className="module-kicker">
        <p className="eyebrow eyebrow-rule">Guided module</p>
        <p className="module-count">{String(moduleNumber).padStart(2, "0")} / {String(totalModules).padStart(2, "0")}</p>
      </div>
      <h1>{module.title}</h1>
      <p className="module-description">{module.description}</p>
      <dl className="module-meta">
        <div>
          <dt>Time</dt>
          <dd>{module.estimatedMinutes} minutes</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>Not started</dd>
        </div>
      </dl>
    </header>
  );
}
