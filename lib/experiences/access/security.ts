import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const GRANT_SECONDS = 60 * 60 * 24 * 7;
const HASH = /^scrypt\$131072\$8\$1\$([0-9a-f]{32})\$([0-9a-f]{128})$/;

let activeHashJobs = 0;

async function derive(password: string, salt: string): Promise<Buffer> {
  if (activeHashJobs >= 2) throw new Error("Password verification is busy. Please try again.");
  activeHashJobs++;
  try { return await new Promise((resolve, reject) => scrypt(password, Buffer.from(salt, "hex"), 64,
    { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
    (error, key) => error ? reject(error) : resolve(key)));
  } finally { activeHashJobs--; }
}
export async function hashExperiencePassword(password: string) {
  if (password.length < 8 || Buffer.byteLength(password) > 1024) throw new Error("Use a password of at least 8 characters and at most 1024 bytes.");
  const salt = randomBytes(16).toString("hex");
  return `scrypt$131072$8$1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyExperiencePassword(password: string, hash: string) {
  const match = HASH.exec(hash);
  if (!match || !password || Buffer.byteLength(password) > 1024) return false;
  return timingSafeEqual(await derive(password, match[1]), Buffer.from(match[2], "hex"));
}
function signature(payload: string, secret: string) {
  if (secret.length < 32) throw new Error("Experience access signing secret is not configured.");
  return createHmac("sha256", secret).update(`purposeos-experience-grant-v1:${payload}`).digest("base64url");
}
export function issueGrant(experienceId: string, revision: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ experienceId, revision, expires: now + GRANT_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function validGrant(token: string | undefined, experienceId: string, revision: string, secret: string, now = Date.now()) {
  if (!token || token.length > 1024) return false;
  try {
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra !== undefined) return false;
    const expected = Buffer.from(signature(payload, secret));
    const received = Buffer.from(supplied);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.experienceId === experienceId && data.revision === revision && Number.isSafeInteger(data.expires) && data.expires > now && data.expires <= now + GRANT_SECONDS * 1000;
  } catch { return false; }
}
export const grantCookieName = (experienceId: string) => `purposeos-experience-${experienceId}`;
export const grantCookieOptions = (production: boolean) => ({ httpOnly: true, secure: production, sameSite: "lax" as const, path: "/", maxAge: GRANT_SECONDS });

export function safeReturnPath(candidate: string | undefined, fallback: string) {
  if (!candidate || candidate.length > 4096 || /[\\\x00-\x1f\x7f]/.test(candidate) || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const url = new URL(candidate, "https://purposeos.invalid");
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== "https://purposeos.invalid" || /[\\\x00-\x1f\x7f]/.test(decoded) || decoded.startsWith("//") || url.pathname.startsWith("/experience-access/")) return fallback;
    if (!/^\/(experiences\/|account\/results\/)/.test(url.pathname)) return fallback;
    return url.pathname + url.search;
  } catch { return fallback; }
}
export function passwordGatePath(slug: string, returnTo: string, launchBlock?: string) {
  const query = new URLSearchParams({ returnTo });
  if (launchBlock) query.set("launchBlock", launchBlock);
  return `/experience-access/${encodeURIComponent(slug)}?${query}`;
}

export function passwordGateRequired(credential: { credential_revision: string } | null, token: string | undefined, experienceId: string, secret: string, adminAuthorized = false) {
  return Boolean(credential && !adminAuthorized && !validGrant(token, experienceId, credential.credential_revision, secret));
}
