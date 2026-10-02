import { notFound, redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { needsExperiencePassword } from "@/lib/experiences/access/server";
import { safeReturnPath } from "@/lib/experiences/access/security";
import { submitExperiencePassword } from "./actions";

export default async function ExperienceAccessPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ returnTo?: string; launchBlock?: string; error?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await createAdminSupabaseClient().from("experiences").select("id,name,slug,status,accent_color").eq("slug", slug).maybeSingle();
  if (result.error || !result.data || ["inactive", "archived"].includes(result.data.status)) notFound();
  const experience = result.data;
  const returnTo = safeReturnPath(query.returnTo, `/experiences/${encodeURIComponent(slug)}`);
  const passwordRequired = await needsExperiencePassword(experience.id);
  if (!query.launchBlock && !passwordRequired) redirect(returnTo);
  return <PlatformShell contextTitle={experience.name}><main className="experience-password-page"><section className="experience-password-panel" style={{ borderTopColor: /^#[0-9a-f]{6}$/i.test(experience.accent_color ?? "") ? experience.accent_color! : undefined }}><p className="platform-eyebrow">PurposeOS Experience access</p><h1>{experience.name}</h1><p>{passwordRequired ? "This experience is password protected." : "Your Experience access is ready."}</p><p>{passwordRequired ? "Enter the access password to continue." : "Continue to resume your Course Assessment launch."}</p><form action={submitExperiencePassword.bind(null, slug, returnTo, query.launchBlock)}>{passwordRequired && <><label htmlFor="experience-password">Access password</label><input id="experience-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} aria-describedby={query.error ? "password-error" : undefined}/></>}{query.error && <p id="password-error" role="alert">{query.error === "busy" ? "Password verification is busy. Please try again." : "The password you entered is not correct."}</p>}<button className="button button-primary" type="submit">Continue</button></form></section></main></PlatformShell>;
}
