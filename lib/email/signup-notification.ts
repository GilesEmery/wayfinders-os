export type SignupEvent = Readonly<{ userId: string; fullName: string; email: string; createdAt: string }>;
export type AdminRecipient = Readonly<{ id: string; email_normalized: string; role: string; status: string }>;

export function signupNotificationRecipients(members: readonly AdminRecipient[]) {
  const seen = new Set<string>();
  return members.filter((member) => {
    const email = member.email_normalized.trim().toLowerCase();
    if (member.status !== "active" || !["admin", "super_admin"].includes(member.role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) return false;
    seen.add(email);
    return true;
  }).map((member) => ({ id: member.id, email: member.email_normalized.trim().toLowerCase() }));
}

export function signupNotificationText(event: SignupEvent) {
  return ["Someone has signed up for PurposeOS.", "", `Name: ${event.fullName.replace(/\s+/g, " ").trim()}`, `Email: ${event.email}`, `Signed up: ${event.createdAt}`, "", "You are receiving this notification because you are an active PurposeOS admin or super admin."].join("\n");
}

/** Each recipient has an independent provider idempotency key, including during retries. */
export async function deliverSignupNotifications(event: SignupEvent, members: readonly AdminRecipient[], config: { apiKey: string; from: string }, dependencies: { fetch: typeof fetch; sleep: (ms: number) => Promise<void> } = { fetch: globalThis.fetch, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  if (!config.apiKey || !config.from) throw new Error("Signup notification email is not configured.");
  const recipients = signupNotificationRecipients(members);
  const results = await Promise.allSettled(recipients.map(async (recipient) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await dependencies.fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `purposeos-signup/${event.userId}/${recipient.id}` },
          body: JSON.stringify({ from: config.from, to: [recipient.email], subject: "New PurposeOS signup", text: signupNotificationText(event) }),
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          const accepted = await response.json() as { id?: unknown };
          if (typeof accepted.id === "string" && accepted.id) return;
          throw new Error("Email provider did not confirm acceptance.");
        }
        // Do not expose the provider's response body (which may contain personal data).
        if (response.status !== 408 && response.status !== 429 && response.status < 500) throw new PermanentEmailError(`Email provider rejected notification (${response.status}).`);
        throw new Error(`Email provider unavailable (${response.status}).`);
      } catch (error) {
        if (error instanceof PermanentEmailError || attempt === 2) throw error;
        await dependencies.sleep(1000 * (attempt + 1));
      }
    }
  }));
  return { recipients: recipients.length, accepted: results.filter((result) => result.status === "fulfilled").length, failedRecipientIds: results.flatMap((result, index) => result.status === "rejected" ? [recipients[index].id] : []) };
}

class PermanentEmailError extends Error {}
