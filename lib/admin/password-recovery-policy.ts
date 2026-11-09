export type RecoveryActor = { id: string; role: "admin" | "super_admin" };

// A recovery credential can take over the target account, so apply the same
// hierarchy as role management, including disabled administrator records.
export function canAssistPasswordRecovery(actor: RecoveryActor, targetUserId: string, targetRole: string | null) {
  if (actor.id === targetUserId || targetRole === "super_admin") return false;
  return actor.role === "super_admin" || (actor.role === "admin" && targetRole !== "admin");
}

export function assistedRecoveryUrl(origin: string, tokenHash: string) {
  const url = new URL("/account/reset-password/confirm", origin);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("token_hash", tokenHash);
  return url.toString();
}
