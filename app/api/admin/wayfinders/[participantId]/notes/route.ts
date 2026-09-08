import { NextResponse, type NextRequest } from "next/server";
import { audit, getAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PayloadError, apiError, readJsonObject } from "@/lib/experiences/lmu/server/http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const identity = await getAdmin();
    if (!identity) return apiError("Purpose OS Admin access is required.", 403);
    const { participantId } = await params;
    const body = await readJsonObject(request);
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note || note.length > 5000) return apiError("Enter a note of 5,000 characters or fewer.", 400);
    const db = createAdminSupabaseClient();
    const { data: participant } = await db.from("participants").select("id").eq("id", participantId).maybeSingle();
    if (!participant) return apiError("Wayfinder not found.", 404);
    const { data, error } = await db.from("crm_notes").insert({ participant_id: participantId, body: note, created_by: identity.id }).select("id").single();
    if (error || !data) return apiError("Unable to save this note.", 400);
    await audit(identity, "created_crm_note", "participant", participantId, { note_id: data.id });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadError) return apiError(error.message, error.status);
    return apiError("Unable to save this note.", 500);
  }
}
