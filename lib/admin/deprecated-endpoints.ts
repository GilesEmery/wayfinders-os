function jsonResponse(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function goneAdminSetupResponse() {
  return jsonResponse("Password-based administrator setup has been removed. Use the secure invitation email sent by Purpose OS.", 410);
}

export function disabledAdminRecoveryResponse() {
  return jsonResponse("Not found.", 404);
}
