import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PARTICIPANT_COLUMNS = "id,auth_user_id,first_name,full_name,email,email_normalized,created_at,updated_at";

export async function getPlatformUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    return error ? null : user;
  } catch {
    return null;
  }
}

export async function ensurePlatformProfile(user: User, requestedFullName?: string) {
  if (!user.email) return { error: "Your account does not have an email address." } as const;

  const admin = createAdminSupabaseClient();
  const email = user.email.toLowerCase();
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const fullName = requestedFullName?.trim() || metadataName;
  const byIdentity = await admin
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byIdentity.error) return { error: "Unable to load your Wayfinders profile." } as const;
  let participant = byIdentity.data;

  // Claim a legacy, unlinked profile before creating a new one. This preserves prior
  // LMU progress and prevents a second participant record for the same person.
  if (!participant) {
    const legacy = await admin
      .from("participants")
      .select(PARTICIPANT_COLUMNS)
      .eq("email_normalized", email)
      .is("auth_user_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (legacy.error) return { error: "Unable to load your Wayfinders profile." } as const;
    if (legacy.data) {
      const linked = await admin
        .from("participants")
        .update({ auth_user_id: user.id, email: user.email, email_normalized: email })
        .eq("id", legacy.data.id)
        .is("auth_user_id", null)
        .select(PARTICIPANT_COLUMNS)
        .maybeSingle();
      if (linked.error) return { error: "Unable to connect your Wayfinders profile." } as const;
      participant = linked.data;
    }
  }

  if (!participant) {
    if (!fullName) return {
      error: "Enter your full name to finish setting up your Wayfinders profile.",
      code: "full_name_required",
    } as const;
    const created = await admin
      .from("participants")
      .insert({ auth_user_id: user.id, first_name: fullName.split(/\s+/)[0], full_name: fullName, email: user.email, email_normalized: email })
      .select(PARTICIPANT_COLUMNS)
      .single();
    if (created.error) {
      const concurrent = await admin.from("participants").select(PARTICIPANT_COLUMNS).eq("auth_user_id", user.id).maybeSingle();
      if (concurrent.error || !concurrent.data) return { error: "Unable to create your Wayfinders profile." } as const;
      participant = concurrent.data;
    } else participant = created.data;
  }

  if (participant.email_normalized !== email || (!participant.full_name && fullName)) {
    const updated = await admin
      .from("participants")
      .update({
        email: user.email,
        email_normalized: email,
        ...(fullName && !participant.full_name ? { full_name: fullName, first_name: fullName.split(/\s+/)[0] } : {}),
      })
      .eq("id", participant.id)
      .eq("auth_user_id", user.id)
      .select(PARTICIPANT_COLUMNS)
      .single();
    if (updated.error) return { error: "Unable to update your Wayfinders profile." } as const;
    participant = updated.data;
  }

  return { participant } as const;
}
