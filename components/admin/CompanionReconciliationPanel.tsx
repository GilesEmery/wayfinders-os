import { humanize } from "@/lib/admin/format";
import type { CompanionReconciliationReport } from "@/lib/experiences/admin/companion-reconciliation";
import { acknowledgeCompanionRemovalAction, reconcileCompanionModuleAction } from "@/app/admin/trainings/[experienceId]/versions/[versionId]/companion-reconciliation-actions";

function ModuleLabel({ title, type, scope, audience }: { title: string; type: string; scope: string; audience: string }) {
  return <><strong>{title}</strong><small>{humanize(type)} · {humanize(scope)} · {humanize(audience)}</small></>;
}

export function CompanionReconciliationPanel({ experienceId, report }: { experienceId: string; report: CompanionReconciliationReport | null }) {
  if (!report || (!report.items.length && !report.newModules.length)) return null;
  const review = report.items.filter((item) => item.classification !== "already_reconciled");
  return <section className={`admin-panel companion-reconciliation${report.blockingCount ? " is-blocking" : ""}`} id="companion-reconciliation">
    <p className="admin-kicker">Publish safety</p>
    <h2>Companion continuity review</h2>
    <p>{report.blockingCount
      ? `${report.blockingCount} Companion ${report.blockingCount === 1 ? "decision is" : "decisions are"} required to preserve learner notes before this Draft can publish.`
      : "Companion identities are safe to carry into this Draft. Review any suggested matches or intentional removals below."}</p>
    <details open={report.blockingCount > 0 || review.length > 0}>
      <summary>Review Companion changes</summary>
      <div className="companion-reconciliation-list">
        {report.items.map((item) => <article key={item.source.id}>
          <div><ModuleLabel title={item.source.display_title} type={item.source.module_type} scope={item.source.scope} audience={item.source.audience}/><span>{item.entryCount} saved learner {item.entryCount === 1 ? "entry" : "entries"}</span></div>
          {item.classification === "already_reconciled" && <p>Continuity confirmed.</p>}
          {item.classification === "likely_inherited" && <><p>This Draft module appears to be the same module, but its stable identity has not been confirmed.</p><form action={reconcileCompanionModuleAction.bind(null, experienceId, report.draftVersionId, item.candidates[0].id, item.source.id)}><button type="submit">Confirm same module: {item.candidates[0].display_title}</button></form></>}
          {item.classification === "ambiguous" && <><p>More than one Draft module could match. Choose the one that continues this module.</p>{item.candidates.map((candidate) => <form key={candidate.id} action={reconcileCompanionModuleAction.bind(null, experienceId, report.draftVersionId, candidate.id, item.source.id)}><button type="submit">Use {candidate.display_title}</button></form>)}</>}
          {item.classification === "removed" && (item.acknowledged ? <p>Intentional removal confirmed.</p> : <><p>No matching Draft module was found. Confirm only if this module was intentionally removed{item.entryCount ? "; learner entries will remain in version history and will not appear in the new Version" : ""}.</p><form action={acknowledgeCompanionRemovalAction.bind(null, experienceId, report.draftVersionId, item.source.id)}><button type="submit">Confirm intentional removal</button></form></>)}
        </article>)}
        {report.newModules.map((module) => <article key={module.id}><div><ModuleLabel title={module.display_title} type={module.module_type} scope={module.scope} audience={module.audience}/></div><p>New in this Draft; no prior learner data is attached.</p></article>)}
      </div>
    </details>
  </section>;
}
