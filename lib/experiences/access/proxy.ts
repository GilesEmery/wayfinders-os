import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { canAdminExperienceById, getAuthorizationContext } from "@/lib/platform/authorization";
import { grantCookieName, passwordGatePath, passwordGateRequired } from "./security";

// Each navigation/API request is checked, including when shared layouts are reused.
export async function experiencePasswordProxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const slug = path.match(/^\/experiences\/([^/]+)/)?.[1]
    ?? path.match(/^\/account\/results\/([^/]+)\/[^/]+$/)?.[1]
    ?? (path.startsWith("/api/lmu/") ? "life-mapping-u" : null);
  if (!slug) return null;
  try {
    const db = createAdminSupabaseClient();
    const experience = await db.from("experiences").select("id,slug").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (experience.error) throw new Error("Access unavailable");
    if (!experience.data) return null;
    const credential = await db.from("experience_password_credentials").select("credential_revision").eq("experience_id", experience.data.id).maybeSingle();
    if (credential.error) throw new Error("Access unavailable");
    if (!credential.data) return null;
    const secret = process.env.EXPERIENCE_ACCESS_SIGNING_SECRET || process.env.SUPABASE_SECRET_KEY || "";
    const token = request.cookies.get(grantCookieName(experience.data.id))?.value;
    if (!passwordGateRequired(credential.data, token, experience.data.id, secret)) return null;
    const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
    });
    const { data: { user } } = await auth.auth.getUser();
    if (user && await canAdminExperienceById(await getAuthorizationContext(user.id, user.email), experience.data.id)) return null;
    const returnTo = path.startsWith("/api/") ? "/experiences/life-mapping-u" : path + request.nextUrl.search;
    const accessUrl = passwordGatePath(experience.data.slug, returnTo);
    const response = path.startsWith("/api/")
      ? NextResponse.json({ error: "Enter the Experience access password to continue.", code: "experience_password_required", accessUrl }, { status: 403 })
      : NextResponse.redirect(new URL(accessUrl, request.url), 303);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Experience access is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
