"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Profile = { full_name: string | null; preferred_name: string | null; phone: string | null; city: string | null; state_region: string | null; country: string | null; timezone: string | null; short_bio: string | null };

async function sendJson(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Unable to save changes.");
}

export function WayfinderProfileForm({ participantId, profile }: { participantId: string; profile: Profile }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try { await sendJson(`/api/admin/wayfinders/${participantId}/profile`, "PATCH", Object.fromEntries(data)); setMessage("Profile updated."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update profile."); }
    finally { setBusy(false); }
  }
  return <form className="crm-profile-form" onSubmit={submit}>
    <label>Full name<input defaultValue={profile.full_name ?? ""} maxLength={160} name="full_name" required/></label>
    <label>Preferred name<input defaultValue={profile.preferred_name ?? ""} maxLength={80} name="preferred_name"/></label>
    <label>Phone<input autoComplete="tel" defaultValue={profile.phone ?? ""} maxLength={40} name="phone" type="tel"/></label>
    <label>City<input autoComplete="address-level2" defaultValue={profile.city ?? ""} maxLength={120} name="city"/></label>
    <label>State / region<input autoComplete="address-level1" defaultValue={profile.state_region ?? ""} maxLength={120} name="state_region"/></label>
    <label>Country<input autoComplete="country-name" defaultValue={profile.country ?? ""} maxLength={120} name="country"/></label>
    <label>Timezone<input defaultValue={profile.timezone ?? ""} maxLength={80} name="timezone" placeholder="America/Indiana/Indianapolis"/></label>
    <label className="crm-profile-bio">Short bio<textarea defaultValue={profile.short_bio ?? ""} maxLength={1000} name="short_bio" rows={4}/></label>
    <div className="crm-form-actions"><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>{message && <p role="status">{message}</p>}</div>
  </form>;
}

export function WayfinderNoteForm({ participantId }: { participantId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setMessage("");
    try { await sendJson(`/api/admin/wayfinders/${participantId}/notes`, "POST", { note: data.get("note") }); form.reset(); setMessage("Note added."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add note."); }
    finally { setBusy(false); }
  }
  return <form className="crm-note-form" onSubmit={submit}><label>Internal note<textarea maxLength={5000} name="note" required rows={4} placeholder="Add relationship context, a conversation summary, or a coaching note…"/></label><div className="crm-form-actions"><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Add note"}</button>{message && <p role="status">{message}</p>}</div></form>;
}
