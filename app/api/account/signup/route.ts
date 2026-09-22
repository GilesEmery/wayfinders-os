import { NextResponse, type NextRequest } from "next/server";
import { ensurePlatformProfile } from "@/lib/platform/auth";
import { passwordValidationError } from "@/lib/platform/password";
import { LMU_SESSION_COOKIE } from "@/lib/experiences/lmu/server/constants";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { connectParticipantToOpenHub } from "@/lib/platform/hub-membership";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const hubSlug = typeof body.hubSlug === "string" ? body.hubSlug : null;
    if (!fullName || fullName.length > 160) return apiError("Enter your full name.", 400);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return apiError("Enter a valid email address.", 400);
    const passwordError = passwordValidationError(password);
    if (passwordError) return apiError(passwordError, 400);
    if (password !== confirmPassword) return apiError("Passwords do not match.", 400);

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    const accountExists = error?.code === "user_already_exists" || /already registered|already exists/i.test(error?.message ?? "") || data.user?.identities?.length === 0;
    if (accountExists) return NextResponse.json({ error: "An account already exists for this email. Sign in instead.", code: "account_exists" }, { status: 409 });
    if (error) return apiError("Unable to create your Wayfinders account.", 400);
    if (!data.user || !data.session) return apiError("Your account was created but requires email confirmation. Turn Confirm Email off for this alpha flow.", 409);
    const context = await ensurePlatformProfile(data.user, fullName);
    if ("error" in context) return NextResponse.json(
      { error: context.error ?? "Unable to create your Wayfinders profile.", code: "code" in context ? context.code : undefined },
      { status: "code" in context && typeof context.code === "string" && ["account_link_ambiguous", "account_link_conflict"].includes(context.code) ? 409 : 500 },
    );
    try {
      await connectParticipantToOpenHub(context.participant.id, hubSlug);
    } catch (hubError) {
      console.error("Account created without requested Hub connection", { participantId: context.participant.id, hubSlug, hubError });
    }
    const response = NextResponse.json(context, { status: 201 });
    response.cookies.delete(LMU_SESSION_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to create your Wayfinders account.", 500);
  }
}
