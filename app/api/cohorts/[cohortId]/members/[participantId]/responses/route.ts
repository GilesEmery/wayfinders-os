import { NextResponse } from "next/server";
import { loadCohortMemberResponses, ResponseLibraryAccessError } from "@/lib/platform/response-library";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request: Request, { params }: { params: Promise<{ cohortId: string; participantId: string }> }) {
  const { cohortId, participantId } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  if (!UUID.test(cohortId) || !UUID.test(participantId)) return NextResponse.json({ error: "Saved responses are unavailable." }, { status: 404, headers });
  const search = new URL(request.url).searchParams;
  const box = search.get("box") ?? undefined;
  if (box && !/^[0-9a-f-]{36}:(questions|assessment):[0-9a-f-]{36}$/i.test(box)) return NextResponse.json({ error: "Invalid response box." }, { status: 400, headers });
  try {
    const data = await loadCohortMemberResponses(cohortId, participantId, { outline: !box && search.get("view") === "outline", box });
    return NextResponse.json(box ? data.courses.flatMap((course) => course.weeks.flatMap((week) => week.activities)) : data, { headers });
  }
  catch (error) { return NextResponse.json({ error: "Saved responses are unavailable." }, { status: error instanceof ResponseLibraryAccessError ? error.status : 500, headers }); }
}
