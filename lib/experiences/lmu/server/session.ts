import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { LMU_SESSION_COOKIE, LMU_SESSION_DAYS } from "./constants";

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiresAt() {
  return new Date(Date.now() + LMU_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires,
});

export async function resolveParticipantSession(request: NextRequest) {
  const token = request.cookies.get(LMU_SESSION_COOKIE)?.value;
  if (!token) return null;

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: session, error } = await admin
    .from("participant_sessions")
    .select("id, participant_id, assessment_id, expires_at")
    .eq("token_hash", hashSessionToken(token))
    .gt("expires_at", now)
    .maybeSingle();

  if (error || !session) return null;

  void admin.from("participant_sessions").update({ last_seen_at: now }).eq("id", session.id);
  return { admin, session };
}
