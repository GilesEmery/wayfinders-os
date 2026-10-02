import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

import { experiencePasswordProxy } from "@/lib/experiences/access/proxy";

export async function proxy(request: NextRequest) {
  const session = await updateSupabaseSession(request);
  const gated = await experiencePasswordProxy(request);
  if (gated) {
    for (const cookie of session.cookies.getAll()) gated.cookies.set(cookie);
    return gated;
  }
  return session;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
