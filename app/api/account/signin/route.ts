import { NextResponse, type NextRequest } from "next/server";
import { ensureParticipantContext } from "@/lib/experiences/lmu/server/account";
import { LMU_SESSION_COOKIE } from "@/lib/experiences/lmu/server/constants";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!email || !password) return apiError("Enter your email and password.", 400);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return apiError("Email or password is incorrect.", 401);
    const context = await ensureParticipantContext(data.user, fullName);
    if ("error" in context) {
      if (context.code === "full_name_required") {
        return NextResponse.json({ error: context.error, code: context.code, email: data.user.email }, { status: 409 });
      }
      return apiError(context.error ?? "Unable to load your Wayfinders profile.", 500);
    }
    const response = NextResponse.json(context);
    response.cookies.delete(LMU_SESSION_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to sign in.", 500);
  }
}
