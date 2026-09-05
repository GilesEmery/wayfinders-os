import { NextResponse } from "next/server";
import { LMU_SESSION_COOKIE } from "@/lib/experiences/lmu/server/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(LMU_SESSION_COOKIE);
  return response;
}
