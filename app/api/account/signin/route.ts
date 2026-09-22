import { NextResponse, type NextRequest } from "next/server";
import { ensurePlatformProfile } from "@/lib/platform/auth";
import { LMU_SESSION_COOKIE } from "@/lib/experiences/lmu/server/constants";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { connectParticipantToOpenHub } from "@/lib/platform/hub-membership";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const hubSlug = typeof body.hubSlug === "string" ? body.hubSlug : "";
    if (!email || !password) return apiError("Enter your email and password.", 400);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return apiError("Email or password is incorrect.", 401);
    const context = await ensurePlatformProfile(data.user, fullName);
    if ("error" in context) {
      if ("code" in context && context.code === "full_name_required") {
        return NextResponse.json({ error: context.error, code: context.code, email: data.user.email }, { status: 409 });
      }
      return NextResponse.json(
        { error: context.error ?? "Unable to load your Wayfinders profile.", code: "code" in context ? context.code : undefined },
        { status: "code" in context && typeof context.code === "string" && ["account_link_ambiguous", "account_link_conflict"].includes(context.code) ? 409 : 500 },
      );
    }
    if (hubSlug) {
      try {
        await connectParticipantToOpenHub(context.participant.id, hubSlug);
      } catch (hubError) {
        console.error("Signed-in account could not be connected to requested Hub", { participantId: context.participant.id, hubSlug, hubError });
      }
    }
    const response = NextResponse.json(context);
    response.cookies.delete(LMU_SESSION_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to sign in.", 500);
  }
}
