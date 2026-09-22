import { NextResponse, type NextRequest } from "next/server";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { PASSWORD_RECOVERY_MESSAGE } from "@/lib/platform/password-recovery";
import { passwordRecoveryRedirectUrl } from "@/lib/platform/password-recovery-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return apiError("Enter a valid email address.", 400);

    const supabase = await createServerSupabaseClient();
    const redirectTo = passwordRecoveryRedirectUrl(request.nextUrl.origin);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) console.error("Participant password recovery email failed", { message: error.message });

    // Supabase intentionally gives the same successful result for unknown emails.
    // Preserve that neutral response for every syntactically valid address.
    return NextResponse.json({ ok: true, message: PASSWORD_RECOVERY_MESSAGE });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    console.error("Participant password recovery request failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: true, message: PASSWORD_RECOVERY_MESSAGE });
  }
}
