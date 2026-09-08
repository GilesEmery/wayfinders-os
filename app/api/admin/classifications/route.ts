import { NextResponse } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const categories = ["journey", "program", "relationship", "crm"];
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function POST(request: Request) {
  const identity = await getAdmin();
  if (!identity || identity.role !== "super_admin") return NextResponse.json({ error: "Super Admin access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})); const name = typeof body.name === "string" ? body.name.trim() : ""; const description = typeof body.description === "string" ? body.description.trim() || null : null; const category = categories.includes(body.category) ? body.category : "journey"; const slug = slugify(name);
  if (!name || name.length > 120 || !slug) return NextResponse.json({ error: "Enter a valid classification name." }, { status: 400 });
  const { data, error } = await createAdminSupabaseClient().from("tags").insert({ name, slug, description, category, status: "active" }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "That classification name or stable key is already in use." }, { status: 400 });
  await audit(identity, "classification_created", "tag", data.id, { slug, name, category });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const identity = await getAdmin();
  if (!identity || identity.role !== "super_admin") return NextResponse.json({ error: "Super Admin access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})); const id = typeof body.id === "string" ? body.id : ""; const name = typeof body.name === "string" ? body.name.trim() : ""; const description = typeof body.description === "string" ? body.description.trim() || null : null; const status = body.status === "archived" ? "archived" : body.status === "active" ? "active" : null;
  if (!id || !name || name.length > 120 || !status) return NextResponse.json({ error: "Enter valid classification changes." }, { status: 400 });
  const db = createAdminSupabaseClient(); const { data: before } = await db.from("tags").select("name,status,slug").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Classification not found." }, { status: 404 });
  const { error } = await db.from("tags").update({ name, description, status }).eq("id", id);
  if (error) return NextResponse.json({ error: "Unable to update classification." }, { status: 400 });
  await audit(identity, status !== before.status ? `classification_${status}` : "classification_renamed", "tag", id, { slug: before.slug, previous_name: before.name, name, previous_status: before.status, status });
  return NextResponse.json({ ok: true });
}
