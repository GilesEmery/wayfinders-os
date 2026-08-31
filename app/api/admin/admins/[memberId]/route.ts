import { NextResponse } from "next/server";
import { audit, requireSuperAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const identity = await requireSuperAdmin();
  const { memberId } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "active" ? "active" : body.status === "disabled" ? "disabled" : null;
  if (!status) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  if (memberId === identity.memberId) return NextResponse.json({ error: "You cannot change your own access." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const { data: target } = await admin.from("admin_members").select("id,email,status").eq("id", memberId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
  const { error } = await admin.from("admin_members").update({ status }).eq("id", memberId);
  if (error) return NextResponse.json({ error: "Unable to update administrator." }, { status: 400 });
  await audit(identity, status === "disabled" ? "admin_disabled" : "admin_enabled", "admin_member", memberId, { targetEmail: target.email });
  return NextResponse.json({ ok: true });
}
