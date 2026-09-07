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
