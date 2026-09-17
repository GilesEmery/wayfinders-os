import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { passwordValidationError } from "@/lib/platform/password";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/platform/password-recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const INVALID_LINK_MESSAGE = "This password reset link is invalid or has expired.";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const passwordError = passwordValidationError(newPassword, "New password");
    if (passwordError) return apiError(passwordError, 400);
    if (newPassword !== confirmPassword) return apiError("Passwords do not match.", 400);

    const cookieStore = await cookies();
    if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== "active") return apiError(INVALID_LINK_MESSAGE, 401);
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return apiError(INVALID_LINK_MESSAGE, 401);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return apiError("Unable to update your password. Please request a new reset link and try again.", 400);
    await supabase.auth.signOut({ scope: "local" });
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
    return NextResponse.json({ ok: true, message: "Your password has been updated." });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to update your password. Please request a new reset link and try again.", 500);
  }
}
