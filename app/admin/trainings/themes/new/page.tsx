import Link from "next/link";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { getExperienceThemes } from "@/lib/experiences/admin/themes";
import { createThemeAction } from "../actions";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin(); const { error } = await searchParams; const data = await getExperienceThemes();
  return <AdminShell admin={admin}><AdminPageHeader eyebrow="Experience branding" title="Create theme" description="Start from the Purpose OS fallback or duplicate an existing controlled configuration." action={<Link className="admin-secondary-link" href="/admin/trainings/themes">Back to themes</Link>}/>{error && <p className="admin-form-message" role="alert">{error}</p>}<form action={createThemeAction} className="admin-form admin-experience-form"><label>Name<input name="name" required maxLength={160}/></label><label>Theme key<input name="theme_key" required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="wayfinders-default"/></label><label>Scope<select name="organization_id" defaultValue=""><option value="">Global Purpose OS</option>{data.organizations.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Starting configuration<select name="source_theme_id" defaultValue=""><option value="">Purpose OS fallback</option>{data.themes.filter(item => item.status !== "archived").map(item => <option value={item.id} key={item.id}>{item.name} · revision {item.revision}</option>)}</select></label><p className="admin-field-note is-wide">New themes always begin as drafts. Existing theme keys receive revisions from their theme detail page.</p><button className="admin-primary" type="submit">Create draft theme</button></form></AdminShell>;
}
