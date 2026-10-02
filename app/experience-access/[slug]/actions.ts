"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { experienceCredential, needsExperiencePassword, signingSecret } from "@/lib/experiences/access/server";
import { grantCookieName, grantCookieOptions, issueGrant, passwordGatePath, safeReturnPath, verifyExperiencePassword } from "@/lib/experiences/access/security";
import { preparePrebuiltAssessmentAction } from "@/lib/experiences/builder/prebuilt-assessment-actions";

export async function submitExperiencePassword(slug: string, candidateReturn: string, launchBlock: string | undefined, form: FormData) {
  const db = createAdminSupabaseClient();
  const experience = await db.from("experiences").select("id,slug,status").eq("slug", slug).maybeSingle();
  if (experience.error || !experience.data || ["inactive", "archived"].includes(experience.data.status)) redirect("/trainings");
  const target = experience.data;
  const returnTo = safeReturnPath(candidateReturn, `/experiences/${encodeURIComponent(slug)}`);
  const credential = await experienceCredential(target.id);
  if (credential && await needsExperiencePassword(target.id)) {
    const password = form.get("password");
    let verified = false;
    try { verified = typeof password === "string" && await verifyExperiencePassword(password, credential.password_hash); }
    catch { redirect(`${passwordGatePath(slug, returnTo, launchBlock)}&error=busy`); }
    if (!verified) {
      redirect(`${passwordGatePath(slug, returnTo, launchBlock)}&error=incorrect`);
    }
    // Re-read immediately before issuing: concurrent password edits never issue a new-revision grant for an old password.
    const current = await experienceCredential(target.id);
    if (!current || current.credential_revision !== credential.credential_revision) redirect(passwordGatePath(slug, returnTo, launchBlock));
    (await cookies()).set(grantCookieName(target.id), issueGrant(target.id, credential.credential_revision, signingSecret()), grantCookieOptions(process.env.NODE_ENV === "production"));
  }
  if (launchBlock) {
    const parent = new URL(returnTo, "https://purposeos.invalid");
    const match = parent.pathname.match(/^\/experiences\/([^/]+)\/course\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match || !/^[0-9a-f-]{36}$/i.test(launchBlock)) redirect(`/experiences/${encodeURIComponent(slug)}`);
    // Confirm that the pending block still targets THIS Experience before creating any participant state.
    const block = await db.from("content_blocks").select("content").eq("id", launchBlock).maybeSingle();
    if (block.error || !block.data?.content || typeof block.data.content !== "object" || Array.isArray(block.data.content) || block.data.content.assessmentExperienceId !== target.id) redirect(returnTo);
    const [, parentSlug, moduleKey, lessonKey, sectionKey] = match.map(decodeURIComponent);
    redirect(await preparePrebuiltAssessmentAction(launchBlock, { slug: parentSlug, moduleKey, lessonKey, sectionKey, cohortId: parent.searchParams.get("cohort") }));
  }
  redirect(returnTo);
}
