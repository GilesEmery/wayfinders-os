import { measureOperation } from "@/lib/experiences/builder/performance-measurement";
import { loadParticipantCompanionUpdates } from "@/lib/experiences/builder/companion-updates";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const query = new URL(request.url).searchParams;
  const after = query.get("after");
  if (after && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(after) || !Number.isFinite(Date.parse(after)))) return Response.json({ error: "Invalid cursor." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  const { slug } = await params;
  const modules = await measureOperation("companion-update", () => loadParticipantCompanionUpdates(slug, query.get("module") ?? "", query.get("lesson") ?? "", query.get("section") ?? "", query.get("cohort"), after));
  return Response.json(modules ? { modules } : { error: "Companion unavailable." }, { status: modules ? 200 : 403, headers: { "Cache-Control": "private, no-store" } });
}
