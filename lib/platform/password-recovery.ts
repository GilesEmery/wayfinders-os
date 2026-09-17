import "server-only";

export const PASSWORD_RECOVERY_COOKIE = "purposeos-password-recovery";
export const PASSWORD_RECOVERY_MESSAGE = "If an account exists for that email, we’ll send password reset instructions.";

export function passwordRecoveryCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 15 * 60,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
