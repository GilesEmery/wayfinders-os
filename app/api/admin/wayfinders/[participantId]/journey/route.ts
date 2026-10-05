import { NextRequest, NextResponse } from "next/server";
import { loadWayfinderJourney } from "@/lib/admin/wayfinders/journey";
import { ResponseLibraryAccessError } from "@/lib/platform/response-library";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const { participantId } = await params;
    const enrollmentId = request.nextUrl.searchParams.get("enrollmentId") ?? undefined;
    const versionId = request.nextUrl.searchParams.get("versionId") ?? undefined;
    const assessmentId = request.nextUrl.searchParams.get("assessmentId") ?? undefined;
    if (![participantId, enrollmentId, versionId, assessmentId].every(value => value === undefined || uuid.test(value)) || (assessmentId && (enrollmentId || versionId)) || (versionId && !enrollmentId)) return NextResponse.json({ error: "Invalid Journey record." }, { status: 400, headers });
    const selection = enrollmentId || assessmentId ? { enrollmentId, versionId, assessmentId } : undefined;
    return NextResponse.json(await loadWayfinderJourney(participantId, selection), { headers });
  } catch (error) {
    const status = error instanceof ResponseLibraryAccessError ? error.status : 500;
    return NextResponse.json({ error: status === 403 ? "Admin access is required." : status === 404 ? "Journey record not found." : "Unable to load Journey records. Please try again." }, { status, headers });
  }
}
