import { NextResponse, type NextRequest } from "next/server";
import { ensureParticipantContext } from "@/lib/experiences/lmu/server/account";
import { apiError, PayloadError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function accountContext(fullName?: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return ensureParticipantContext(user, fullName);
}

export async function GET() {
  try {
    const context = await accountContext();
    if (!context) return apiError("No authenticated Wayfinders account.", 401);
    if ("error" in context) {
      if (context.code === "full_name_required") {
        return NextResponse.json({ error: context.error, code: context.code }, { status: 409 });
      }
      return apiError(context.error ?? "Unable to load your Wayfinders profile.", 500);
    }
    return NextResponse.json(context);
  } catch {
    return apiError("Unable to load your Wayfinders account.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!fullName || fullName.length > 160) return apiError("Enter your full name.", 400);
    const context = await accountContext(fullName);
    if (!context) return apiError("Sign in to continue.", 401);
    if ("error" in context) return apiError(context.error ?? "Unable to load your Wayfinders profile.", 500);
    return NextResponse.json(context);
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to resume your Wayfinders account.", 500);
  }
}
