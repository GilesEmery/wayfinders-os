import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: NextRequest) {
  try {
    const identity = await getAdmin();
    if (!identity) return apiError("Purpose OS Admin access is required.", 403);
    const body = await readJsonObject(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "";
    const membershipMode = ["open", "approval_required", "invite_only"].includes(String(body.membershipMode)) ? String(body.membershipMode) : "invite_only";
    if (!name || name.length > 160) return apiError("Enter a Hub name.", 400);
    if (!SLUG_PATTERN.test(slug)) return apiError("Use a lowercase URL slug with letters, numbers, and hyphens.", 400);
    const db = createAdminSupabaseClient();
    const { data: hub, error } = await db.from("hubs").insert({ name, slug, description: description || null, membership_mode: membershipMode, status: "active", location: { city, state, country } }).select("id,name,slug").single();
    if (error?.code === "23505") return apiError("That Hub URL is already in use.", 409);
    if (error || !hub) return apiError("Unable to create the Hub.", 500);
    await audit(identity, "created_hub", "hub", hub.id, { slug: hub.slug, membership_mode: membershipMode });
    return NextResponse.json(hub, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to create the Hub.", 500);
  }
}
