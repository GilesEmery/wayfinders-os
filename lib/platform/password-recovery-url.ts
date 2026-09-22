export function passwordRecoveryRedirectUrl(origin: string) {
  const redirect = new URL("/account/reset-password/confirm", origin);
  redirect.searchParams.set("type", "recovery");
  return redirect.toString();
}
