import { NextResponse, type NextRequest } from "next/server";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getPlatformUser(); if (!user) return apiError("Sign in to update Hub preferences.", 401);
    const profile = await ensurePlatformProfile(user); if ("error" in profile) return apiError(profile.error ?? "Unable to load your profile.", 409);
    const body = await readJsonObject(request); const hubId = typeof body.defaultHubId === "string" ? body.defaultHubId : "";
    if (!hubId) return apiError("Choose a valid Hub.", 400);
    const db = createAdminSupabaseClient();
    const { data: membership } = await db.from("hub_memberships").select("id").eq("participant_id", profile.participant.id).eq("hub_id", hubId).eq("status", "active").maybeSingle();
    if (!membership) return apiError("You can only select a Hub where you have an active membership.", 403);
    const { error } = await db.from("participant_preferences").upsert({ participant_id: profile.participant.id, default_hub_id: hubId }, { onConflict: "participant_id" });
    if (error) return apiError("Unable to update your default Hub.", 500);
    return NextResponse.json({ defaultHubId: hubId });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to update your Hub preferences.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getPlatformUser(); if (!user) return apiError("Sign in to join a Hub.", 401);
    const profile = await ensurePlatformProfile(user); if ("error" in profile) return apiError(profile.error ?? "Unable to load your profile.", 409);
    const body = await readJsonObject(request); const hubId = typeof body.hubId === "string" ? body.hubId : "";
    const db = createAdminSupabaseClient();
    const { data: hub } = await db.from("hubs").select("id,name").eq("id", hubId).eq("status", "active").eq("membership_mode", "open").maybeSingle();
    if (!hub) return apiError("That Hub is not available for open joining.", 403);
    const { data: existing } = await db.from("hub_memberships").select("id,membership_role,status").eq("participant_id", profile.participant.id).eq("hub_id", hub.id).maybeSingle();
    const membershipResult = existing
      ? await db.from("hub_memberships").update({ status: "active", joined_at: new Date().toISOString() }).eq("id", existing.id)
      : await db.from("hub_memberships").insert({ participant_id: profile.participant.id, hub_id: hub.id, membership_role: "member", status: "active", joined_at: new Date().toISOString() });
    const error = membershipResult.error;
    if (error) return apiError("Unable to join the Hub.", 500);
    const { data: preference } = await db.from("participant_preferences").select("default_hub_id").eq("participant_id", profile.participant.id).maybeSingle();
    if (!preference?.default_hub_id) await db.from("participant_preferences").upsert({ participant_id: profile.participant.id, default_hub_id: hub.id }, { onConflict: "participant_id" });
    return NextResponse.json({ hubId: hub.id, message: `Connected to ${hub.name}.` });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to join the Hub.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getPlatformUser(); if (!user) return apiError("Sign in to leave a Hub.", 401);
    const profile = await ensurePlatformProfile(user); if ("error" in profile) return apiError(profile.error ?? "Unable to load your profile.", 409);
    const body = await readJsonObject(request); const hubId = typeof body.hubId === "string" ? body.hubId : "";
    const db = createAdminSupabaseClient();
    const { data: membership } = await db.from("hub_memberships").select("id,membership_role").eq("participant_id", profile.participant.id).eq("hub_id", hubId).maybeSingle();
    if (membership?.membership_role === "hub_leader") return apiError("A Hub Leader relationship must be changed by a Purpose OS administrator.", 403);
    const { error } = await db.from("hub_memberships").delete().eq("participant_id", profile.participant.id).eq("hub_id", hubId);
    if (error) return apiError("Unable to leave the Hub.", 500);
    await db.from("participant_preferences").update({ default_hub_id: null }).eq("participant_id", profile.participant.id).eq("default_hub_id", hubId);
    return NextResponse.json({ hubId, message: "Hub connection removed." });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to leave the Hub.", 500);
  }
}
