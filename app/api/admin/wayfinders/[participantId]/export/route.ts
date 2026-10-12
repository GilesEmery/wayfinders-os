import { NextResponse } from "next/server";
import { exportOperationalWayfinder, OperationalExportAccessError } from "@/lib/admin/wayfinders/operational-export";
import { exportWayfinder, WayfinderExportError } from "@/lib/admin/wayfinders/export";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const { participantId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId)) return NextResponse.json({ error: "Invalid Wayfinder." }, { status: 400, headers });
    const view = new URL(request.url).searchParams.get("view");
    if (view && view !== "operational") return NextResponse.json({ error: "Unsupported export view." }, { status: 400, headers });
    const result = view === "operational" ? await exportOperationalWayfinder(participantId) : await exportWayfinder(participantId);
    return new Response(result.csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${result.filename}"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof WayfinderExportError || error instanceof OperationalExportAccessError ? error.message : "Unable to download the complete record. Please try again." }, { status: error instanceof WayfinderExportError || error instanceof OperationalExportAccessError ? error.status : 500, headers });
  }
}
