export const DEFAULT_ADMIN_INVITATION_TTL_MINUTES = 60;

export function adminInvitationTtlMinutes(value = process.env.ADMIN_INVITATION_TTL_MINUTES) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 10_080
    ? parsed
    : DEFAULT_ADMIN_INVITATION_TTL_MINUTES;
}

export function adminInvitationExpiresAt(issuedAt: Date, ttlMinutes = adminInvitationTtlMinutes()) {
  return new Date(issuedAt.getTime() + ttlMinutes * 60_000);
}

export function adminInvitationRedirectUrl(requestUrl: string) {
  const redirect = new URL("/api/admin/auth/confirm", requestUrl);
  redirect.searchParams.set("type", "invite");
  redirect.searchParams.set("next", "/admin/reset-password");
  return redirect.toString();
}
