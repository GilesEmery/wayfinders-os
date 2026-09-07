"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateWayfinderForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/wayfinders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: form.get("fullName"), email: form.get("email"), password: form.get("password") }) });
    const payload = await response.json().catch(() => ({})) as { error?: string; participantId?: string };
    if (!response.ok || !payload.participantId) { setError(payload.error ?? "Unable to create the Wayfinder."); setBusy(false); return; }
    router.push(`/admin/users/${payload.participantId}`); router.refresh();
  }
  return <form className="admin-form admin-create-wayfinder" onSubmit={submit}>
    <div className="admin-wayfinder-identity-note"><strong>Wayfinder is automatic</strong><p>Creating this Purpose OS account creates the person’s universal Wayfinder identity. Additional access and journey relationships are assigned afterward.</p></div>
    <label>Full Name<input autoComplete="name" maxLength={160} name="fullName" required /></label>
    <label>Email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
    <label>Temporary / Initial Password<input autoComplete="new-password" minLength={8} name="password" required type="password" /></label>
    {error && <p className="admin-form-message" role="alert">{error}</p>}
    <button className="admin-primary" disabled={busy} type="submit">{busy ? "Creating…" : "Create Wayfinder"}</button>
    <p className="admin-muted">Additional access, leadership, communities, and journey classifications can be managed from the Wayfinder detail page.</p>
  </form>;
}
