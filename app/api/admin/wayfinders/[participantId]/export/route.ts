import { NextResponse } from "next/server";
import { exportWayfinder, WayfinderExportError } from "@/lib/admin/wayfinders/export";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const { participantId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId)) return NextResponse.json({ error: "Invalid Wayfinder." }, { status: 400, headers });
    const result = await exportWayfinder(participantId);
    return new Response(result.csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${result.filename}"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof WayfinderExportError ? error.message : "Unable to download the complete record. Please try again." }, { status: error instanceof WayfinderExportError ? error.status : 500, headers });
  }
}
