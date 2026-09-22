import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const DEFAULT_HUB_SLUG = "wayfinders-hub-main";

export async function connectParticipantToOpenHub(participantId: string, requestedSlug?: string | null) {
  const slug = requestedSlug?.trim().toLowerCase() || DEFAULT_HUB_SLUG;
  const db = createAdminSupabaseClient();
  const { data: hub, error: hubError } = await db.from("hubs").select("id,slug,name").eq("slug", slug).eq("status", "active").eq("membership_mode", "open").maybeSingle();
  if (hubError) throw new Error("Unable to resolve Hub context.");
  if (!hub) return null;
  const { data: existing } = await db.from("hub_memberships").select("id,membership_role,status").eq("participant_id", participantId).eq("hub_id", hub.id).maybeSingle();
  const membershipResult = existing
    ? await db.from("hub_memberships").update({ status: "active", joined_at: new Date().toISOString() }).eq("id", existing.id)
    : await db.from("hub_memberships").insert({ participant_id: participantId, hub_id: hub.id, membership_role: "member", status: "active", joined_at: new Date().toISOString() });
  const membershipError = membershipResult.error;
  if (membershipError) throw new Error("Unable to connect the participant to the Hub.");
  const { data: preference } = await db.from("participant_preferences").select("default_hub_id").eq("participant_id", participantId).maybeSingle();
  if (!preference?.default_hub_id) {
    const { error: preferenceError } = await db.from("participant_preferences").upsert({ participant_id: participantId, default_hub_id: hub.id }, { onConflict: "participant_id" });
    if (preferenceError) throw new Error("Unable to set the participant's default Hub.");
  }
  return hub;
}
