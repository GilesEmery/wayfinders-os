import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "This reset link is no longer valid." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "Unable to update the password." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
