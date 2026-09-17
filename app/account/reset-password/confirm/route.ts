import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { PASSWORD_RECOVERY_COOKIE, passwordRecoveryCookieOptions } from "@/lib/platform/password-recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createServerSupabaseClient();
  const result = code && type === "recovery"
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type === "recovery"
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing recovery credentials") };

  if (result.error) return NextResponse.redirect(new URL("/account/reset-password?error=invalid", request.url), 303);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.redirect(new URL("/account/reset-password?error=invalid", request.url), 303);

  const response = NextResponse.redirect(new URL("/account/reset-password", request.url), 303);
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "active", passwordRecoveryCookieOptions());
  return response;
}
