import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensurePlatformProfile, hasPlatformAdminAccess, platformAccountFromProfile } from "@/lib/platform/auth";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function authenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}

export async function GET() {
  try {
    const identity = await authenticatedUser();
    if (!identity) return apiError("Sign in to view your account.", 401);
    const profile = await ensurePlatformProfile(identity.user);
    if ("error" in profile) return NextResponse.json(
      { error: profile.error ?? "Unable to load your profile.", code: "code" in profile ? profile.code : undefined },
      { status: "code" in profile && typeof profile.code === "string" && ["full_name_required", "account_link_ambiguous", "account_link_conflict"].includes(profile.code) ? 409 : 500 },
    );
    const isAdmin = await hasPlatformAdminAccess(identity.user.id);
    return NextResponse.json(platformAccountFromProfile(identity.user, profile.participant.full_name, isAdmin));
  } catch {
    return apiError("Unable to load your account.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!fullName || fullName.length > 160) return apiError("Enter your full name.", 400);
    const identity = await authenticatedUser();
    if (!identity) return apiError("Sign in to update your account.", 401);
    const profile = await ensurePlatformProfile(identity.user, fullName);
    if ("error" in profile) return apiError(profile.error ?? "Unable to update your profile.", 500);

    const admin = createAdminSupabaseClient();
    const { data: participant, error: profileError } = await admin
      .from("participants")
      .update({ full_name: fullName, first_name: fullName.split(/\s+/)[0] })
      .eq("id", profile.participant.id)
      .eq("auth_user_id", identity.user.id)
      .select("full_name")
      .single();
    if (profileError) return apiError("Unable to update your profile.", 500);

    const { data, error: metadataError } = await identity.supabase.auth.updateUser({ data: { full_name: fullName } });
    if (metadataError || !data.user) return apiError("Your profile was updated, but account metadata could not be synchronized.", 500);
    const isAdmin = await hasPlatformAdminAccess(data.user.id);
    return NextResponse.json(platformAccountFromProfile(data.user, participant.full_name, isAdmin));
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to update your account.", 500);
  }
}
