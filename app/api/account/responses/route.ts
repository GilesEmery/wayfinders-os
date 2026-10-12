import { NextResponse } from "next/server";
import { loadOwnResponseLibrary } from "@/lib/platform/response-library";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const enrollmentId = search.get("enrollment");
  const week = search.get("week") ?? undefined;
  if (week && !/^[0-9a-f-]{36}:[0-9a-f-]{36}$/i.test(week)) return NextResponse.json({ error: "Invalid week." }, { status: 400, headers });
  if (!enrollmentId || (enrollmentId !== "life-mapping-u" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrollmentId))) {
    return NextResponse.json({ error: "Choose an Experience to view." }, { status: 400, headers });
  }
  try {
    const result = await loadOwnResponseLibrary(enrollmentId, { outline: !week && search.get("view") === "outline", week });
    if (!result) return NextResponse.json({ error: "Sign in to view your saved work." }, { status: 401, headers });
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "Saved work could not be loaded. Please retry." }, { status: 503, headers });
  }
}
