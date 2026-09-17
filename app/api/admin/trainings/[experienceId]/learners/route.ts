import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const RESULT_LIMIT = 100;

export async function GET(request: NextRequest, { params }: { params: Promise<{ experienceId: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Purpose OS Admin access is required." }, { status: 403 });
  const { experienceId } = await params;
  const authorization = await getAuthorizationContext(admin.id, admin.email);
  if (!await canAdminExperienceById(authorization, experienceId)) return NextResponse.json({ error: "You are not authorized to manage this training." }, { status: 403 });
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return NextResponse.json({ learners: [] });
  const db = createAdminSupabaseClient();
  const pattern = `%${query}%`;
  const [byName, byEmail] = await Promise.all([
    db.from("participants").select("id,full_name,email,auth_user_id").ilike("full_name", pattern).order("full_name").limit(RESULT_LIMIT),
    db.from("participants").select("id,full_name,email,auth_user_id").ilike("email", pattern).order("email").limit(RESULT_LIMIT),
  ]);
  if (byName.error || byEmail.error) return NextResponse.json({ error: "Wayfinder search could not be completed." }, { status: 500 });
  const unique = new Map([...byName.data, ...byEmail.data].map((learner) => [learner.id, learner]));
  const learners = [...unique.values()].sort((left, right) => (left.full_name ?? left.email ?? "").localeCompare(right.full_name ?? right.email ?? "")).slice(0, RESULT_LIMIT);
  return NextResponse.json({ learners });
}
