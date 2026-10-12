import "server-only";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type AdminIdentity = {
  id: string;
  email: string;
  displayName?: string | null;
  role: "super_admin" | "admin";
  memberId: string;
};

export async function getAdmin(): Promise<AdminIdentity | null> {
  const supabase = await createServerSupabaseClient();
  const identityRead = await supabase.auth.getUser();
  // No session is the normal signed-out state, never an authorization grant.
  if (identityRead.error?.name === "AuthSessionMissingError") return null;
  if (identityRead.error) throw new Error("Admin access could not be verified. Please try again.");
  const { user } = identityRead.data;
  if (!user?.email) return null;
  const admin = createAdminSupabaseClient();
  const { data: member, error: memberError } = await admin
    .from("admin_members")
    .select("id,email_normalized,auth_user_id,role,status")
    .eq("auth_user_id", user.id)
    .eq("email_normalized", user.email.toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  if (memberError) throw new Error("Admin access could not be verified. Please try again.");
  if (!member || (member.role !== "admin" && member.role !== "super_admin"))
    return null;
  const { data: participant, error: participantError } = await admin
    .from("participants")
    .select("full_name,first_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (participantError) throw new Error("Admin profile could not be verified. Please try again.");
  return {
    id: user.id,
    email: member.email_normalized,
    displayName: participant?.full_name ?? participant?.first_name ?? null,
    role: member.role,
    memberId: member.id,
  };
}

export async function requireAdmin() {
  const identity = await getAdmin();
  if (!identity) redirect("/admin/login");
  return identity;
}

export async function requireSuperAdmin() {
  const identity = await requireAdmin();
  if (identity.role !== "super_admin") redirect("/admin?error=forbidden");
  return identity;
}

export async function audit(
  identity: AdminIdentity,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  await createAdminSupabaseClient()
    .from("admin_audit_log")
    .insert({
      admin_user_id: identity.id,
      admin_email: identity.email,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
    metadata: metadata as Json,
    });
}

export async function auditSecurityEvent(
  identity: AdminIdentity,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await createAdminSupabaseClient()
    .from("admin_audit_log")
    .insert({
      admin_user_id: identity.id,
      admin_email: identity.email,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata: metadata as Json,
    });
  if (error) throw new Error(`Unable to record administrative security event: ${error.message}`);
}
