import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";
import type { Database } from "@/lib/supabase/database.types";

const limits = { full_name: 160, preferred_name: 80, phone: 40, city: 120, state_region: 120, country: 120, timezone: 80, short_bio: 1000 } as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const identity = await getAdmin();
    if (!identity) return apiError("Purpose OS Admin access is required.", 403);
    const { participantId } = await params;
    const body = await readJsonObject(request);
    const updates: Database["public"]["Tables"]["participants"]["Update"] = {};
    for (const [field, limit] of Object.entries(limits)) {
      if (!(field in body)) continue;
      const value = typeof body[field] === "string" ? body[field].trim() : "";
      if (value.length > limit || (field === "full_name" && !value)) return apiError(`Enter a valid ${field.replaceAll("_", " ")}.`, 400);
      updates[field as keyof typeof limits] = value || null;
    }
    if (!Object.keys(updates).length) return apiError("No profile changes were provided.", 400);
    const db = createAdminSupabaseClient();
    const { data: participant } = await db.from("participants").select("id").eq("id", participantId).maybeSingle();
    if (!participant) return apiError("Wayfinder not found.", 404);
    const { error } = await db.from("participants").update(updates).eq("id", participantId);
    if (error) return apiError("Unable to update this profile.", 400);
    await audit(identity, "updated_wayfinder_profile", "participant", participantId, { fields: Object.keys(updates) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to update this profile.", 500);
  }
}
