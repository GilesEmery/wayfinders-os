import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const identity = await getAdmin();
  if (!identity) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  if (newPassword === currentPassword) return NextResponse.json({ error: "Choose a password different from your current password." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const reauthenticated = await supabase.auth.signInWithPassword({ email: identity.email, password: currentPassword });
  if (reauthenticated.error || reauthenticated.data.user?.id !== identity.id) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: "Unable to update the password." }, { status: 400 });
  await audit(identity, "admin_password_changed", "admin_member", identity.memberId, { changed_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
