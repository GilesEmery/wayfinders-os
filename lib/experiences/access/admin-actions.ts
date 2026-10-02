"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPlatformUser } from "@/lib/platform/auth";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashExperiencePassword } from "./security";

export async function updateExperiencePassword(experienceId: string, form: FormData) {
  const user = await getPlatformUser();
  if (!user || !await canAdminExperienceById(await getAuthorizationContext(user.id, user.email), experienceId)) throw new Error("You are not authorized to manage this Experience password.");
  const db = createAdminSupabaseClient();
  const operation = form.get("operation");
  let message = "Password protection updated.";
  try {
    if (operation === "remove") {
      const result = await db.from("experience_password_credentials").delete().eq("experience_id", experienceId);
      if (result.error) throw new Error("Unable to remove password protection.");
    } else if (operation === "set") {
      const password = form.get("password");
      if (typeof password !== "string" || password !== form.get("confirm_password")) throw new Error("The passwords must match.");
      const passwordHash = await hashExperiencePassword(password);
      const result = await db.from("experience_password_credentials").upsert({ experience_id: experienceId, password_hash: passwordHash });
      if (result.error) throw new Error("Unable to save password protection.");
    } else throw new Error("Choose a supported password operation.");
    const audit = await db.from("admin_audit_log").insert({ admin_user_id: user.id, admin_email: user.email ?? "", action: operation === "remove" ? "experience.password.removed" : "experience.password.updated", entity_type: "experience", entity_id: experienceId, metadata: { operation } });
    if (audit.error) message = "Password protection updated, but the audit record could not be saved.";
  } catch (error) {
    redirect(`/admin/trainings/${encodeURIComponent(experienceId)}?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to update password protection.")}`);
  }
  revalidatePath(`/admin/trainings/${experienceId}`);
  revalidatePath("/trainings");
  redirect(`/admin/trainings/${encodeURIComponent(experienceId)}?passwordNotice=${encodeURIComponent(message)}`);
}
