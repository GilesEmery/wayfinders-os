import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PARTICIPANT_COLUMNS = "id,auth_user_id,first_name,full_name,email,email_normalized,created_at,updated_at";
const ACCOUNT_LINK_AMBIGUOUS = "We found more than one existing Wayfinders record associated with this email. Please contact us so we can connect your account correctly.";
const ACCOUNT_LINK_CONFLICT = "This email is already connected to another PurposeOS account. Please contact support if you believe this is incorrect.";

export type PlatformAccount = { email: string; fullName: string; displayName: string; isAdmin: boolean };

function accountFromUser(user: User, profileName?: string | null, isAdmin = false): PlatformAccount {
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const fullName = profileName?.trim() || metadataName;
  return {
    email: user.email ?? "",
    fullName,
    displayName: fullName || user.email?.split("@")[0] || "Account",
    isAdmin,
  };
}

async function recordAccountLinked(participantId: string, user: User, normalizedEmail: string) {
  const result = await createAdminSupabaseClient().from("admin_audit_log").insert({
    admin_user_id: user.id,
    admin_email: normalizedEmail,
    action: "participant.account_linked",
    entity_type: "participant",
    entity_id: participantId,
    metadata: { matching_method: "normalized_email" },
  });
  if (result.error) console.error("Participant account link audit failed", { participantId, authUserId: user.id, message: result.error.message });
}

export async function getPlatformUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    return error ? null : user;
  } catch {
    return null;
  }
}

export async function getPlatformAccount() {
  const user = await getPlatformUser();
  if (!user) return null;
  try {
    const admin = createAdminSupabaseClient();
    const [{ data: profile }, { data: member }] = await Promise.all([
      admin.from("participants").select("full_name").eq("auth_user_id", user.id).maybeSingle(),
      admin.from("admin_members").select("id").eq("auth_user_id", user.id).eq("status", "active").in("role", ["admin", "super_admin"]).maybeSingle(),
    ]);
    return accountFromUser(user, profile?.full_name, Boolean(member));
  } catch {
    return accountFromUser(user);
  }
}

export async function hasPlatformAdminAccess(authUserId: string) {
  const { data } = await createAdminSupabaseClient()
    .from("admin_members")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("status", "active")
    .in("role", ["admin", "super_admin"])
    .maybeSingle();
  return Boolean(data);
}

export function platformAccountFromProfile(user: User, fullName?: string | null, isAdmin = false) {
  return accountFromUser(user, fullName, isAdmin);
}

export async function ensurePlatformProfile(user: User, requestedFullName?: string) {
  if (!user.email) return { error: "Your account does not have an email address." } as const;

  const admin = createAdminSupabaseClient();
  const email = user.email.trim().toLowerCase();
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const fullName = requestedFullName?.trim() || metadataName;
  const byIdentity = await admin
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byIdentity.error) return { error: "Unable to load your Wayfinders profile." } as const;
  let participant = byIdentity.data;

  // Claim a legacy, unlinked profile before creating a new one. The conditional
  // update is the atomic claim: a losing concurrent request must re-read and stop,
  // never fall through to participant creation.
  if (!participant) {
    const matches = await admin
      .from("participants")
      .select(PARTICIPANT_COLUMNS)
      .eq("email_normalized", email)
      .order("created_at", { ascending: true })
      .limit(3);
    if (matches.error) return { error: "Unable to load your Wayfinders profile." } as const;
    const linkedToAnotherUser = (matches.data ?? []).find((row) => row.auth_user_id && row.auth_user_id !== user.id);
    const unlinked = (matches.data ?? []).filter((row) => !row.auth_user_id);
    if (linkedToAnotherUser) {
      console.error("Participant account linking conflict", { authUserId: user.id, normalizedEmail: email });
      return { error: ACCOUNT_LINK_CONFLICT, code: "account_link_conflict" } as const;
    }
    if (unlinked.length > 1 || (matches.data?.length ?? 0) > 1) {
      console.error("Participant account linking ambiguity", { authUserId: user.id, normalizedEmail: email, matchCount: matches.data?.length ?? 0 });
      return { error: ACCOUNT_LINK_AMBIGUOUS, code: "account_link_ambiguous" } as const;
    }
    if (unlinked.length === 1) {
      const candidate = unlinked[0];
      const linked = await admin
        .from("participants")
        .update({ auth_user_id: user.id })
        .eq("id", candidate.id)
        .eq("email_normalized", email)
        .is("auth_user_id", null)
        .select(PARTICIPANT_COLUMNS)
        .maybeSingle();
      if (linked.error) return { error: "Unable to connect your Wayfinders profile." } as const;
      if (linked.data) {
        participant = linked.data;
        await recordAccountLinked(participant.id, user, email);
        console.info("Participant account linked", { participantId: participant.id, authUserId: user.id, matchingMethod: "normalized_email" });
      } else {
        const claimed = await admin.from("participants").select(PARTICIPANT_COLUMNS).eq("id", candidate.id).maybeSingle();
        if (claimed.error) return { error: "Unable to connect your Wayfinders profile." } as const;
        if (claimed.data?.auth_user_id === user.id) participant = claimed.data;
        else {
          console.error("Participant account linking claim lost", { authUserId: user.id, normalizedEmail: email });
          return { error: ACCOUNT_LINK_CONFLICT, code: "account_link_conflict" } as const;
        }
      }
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
