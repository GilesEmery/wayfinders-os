import { NextResponse, type NextRequest } from "next/server";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (newPassword.length < 8) return apiError("New password must be at least 8 characters.", 400);
    if (newPassword !== confirmPassword) return apiError("Passwords do not match.", 400);

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return apiError("Sign in to change your password.", 401);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return apiError("Unable to update your password. Please try again.", 400);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to update your password.", 500);
  }
}
