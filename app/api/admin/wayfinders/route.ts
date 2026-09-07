import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { ensurePlatformProfile } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;
  try {
    const identity = await getAdmin();
    if (!identity) return apiError("Purpose OS Admin access is required.", 403);
    const body = await readJsonObject(request);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!fullName || fullName.length > 160) return apiError("Enter a full name.", 400);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return apiError("Enter a valid email address.", 400);
    if (password.length < 8) return apiError("The initial password must be at least 8 characters.", 400);

    const db = createAdminSupabaseClient();
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) return apiError(error?.message ?? "Unable to create the Wayfinder account.", 400);
    createdAuthUserId = data.user.id;
    const profile = await ensurePlatformProfile(data.user, fullName);
    if ("error" in profile) {
      await db.auth.admin.deleteUser(data.user.id);
      return apiError(profile.error ?? "Unable to create the Wayfinder profile.", 500);
    }
    await audit(identity, "created_wayfinder", "participant", profile.participant.id, { auth_user_id: data.user.id });
    return NextResponse.json({ participantId: profile.participant.id }, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    if (createdAuthUserId) await createAdminSupabaseClient().auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    return apiError("Unable to create the Wayfinder.", 500);
  }
}
