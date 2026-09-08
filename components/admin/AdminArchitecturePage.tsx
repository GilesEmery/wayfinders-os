import { AdminBuildBlueprint } from "@/components/admin/AdminBuildBlueprint";
import { AdminEmptyState, AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { ADMIN_BLUEPRINTS } from "@/lib/admin/build-blueprints";

export async function AdminArchitecturePage({ eyebrow, title, description, sections }: { eyebrow: string; title: string; description: string; sections: Array<{ title: string; description: string }> }) {
  const admin = await requireAdmin();
  const blueprint = Object.values(ADMIN_BLUEPRINTS).find((item) => item.title === title);
  const showDevelopmentBlueprint = process.env.NODE_ENV === "development" && blueprint;
  return <AdminShell admin={admin} showAutomaticBlueprint={!showDevelopmentBlueprint}><AdminPageHeader eyebrow={eyebrow} title={title} description={description}/>{showDevelopmentBlueprint ? <AdminBuildBlueprint blueprint={blueprint}/> : <><section className="admin-architecture-grid">{sections.map((section) => <article key={section.title}><span>FUTURE CAPABILITY</span><h2>{section.title}</h2><p>{section.description}</p></article>)}</section><AdminEmptyState title={`${title} systems are not connected yet`} description="This route establishes the Purpose OS administrative structure without creating speculative records or production schemas."/></>}</AdminShell>;
}
