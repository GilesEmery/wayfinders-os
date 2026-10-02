import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPlatformUser } from "@/lib/platform/auth";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { grantCookieName, passwordGatePath, passwordGateRequired, safeReturnPath } from "./security";

export function signingSecret() {
  const secret = process.env.EXPERIENCE_ACCESS_SIGNING_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret || secret.length < 32) throw new Error("Experience access signing secret is not configured.");
  return secret;
}
export async function experienceCredential(experienceId: string) {
  const result = await createAdminSupabaseClient().from("experience_password_credentials").select("password_hash,credential_revision").eq("experience_id", experienceId).maybeSingle();
  if (result.error) throw new Error("Unable to verify Experience password protection.");
  return result.data;
}
export async function passwordManagementAuthorized(experienceId: string) {
  const user = await getPlatformUser();
  return Boolean(user && await canAdminExperienceById(await getAuthorizationContext(user.id, user.email), experienceId));
}
export async function needsExperiencePassword(experienceId: string) {
  const credential = await experienceCredential(experienceId);
  if (!credential) return false;
  const token = (await cookies()).get(grantCookieName(experienceId))?.value;
  return passwordGateRequired(credential, token, experienceId, signingSecret(), await passwordManagementAuthorized(experienceId));
}
export async function requireExperiencePassword(experience: { id: string; slug: string }, returnTo?: string) {
  if (!await needsExperiencePassword(experience.id)) return;
  const path = returnTo ?? (await headers()).get("x-purposeos-request-path") ?? undefined;
  redirect(passwordGatePath(experience.slug, safeReturnPath(path, `/experiences/${encodeURIComponent(experience.slug)}`)));
}
export async function requireExperiencePasswordBySlug(slug: string, returnTo?: string) {
  const result = await createAdminSupabaseClient().from("experiences").select("id,slug").eq("slug", slug).maybeSingle();
  if (result.error) throw new Error("Unable to verify Experience access.");
  if (result.data) await requireExperiencePassword(result.data, returnTo);
}
