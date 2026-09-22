"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function HubCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(["name", "slug", "description", "city", "state", "country", "membershipMode"].map((key) => [key, String(form.get(key) ?? "")]));
    try {
      const response = await fetch("/api/admin/hubs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as { error?: string; name?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create the Hub.");
      event.currentTarget.reset(); setMessage(`${payload.name ?? "Hub"} created.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create the Hub."); }
    finally { setBusy(false); }
  }
  return <details className="admin-hub-create"><summary>Create a Hub</summary><form className="admin-form admin-hub-create-form" onSubmit={submit}><label>Hub name<input name="name" maxLength={160} required/></label><label>Public URL slug<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="churchatmain" required/></label><label className="is-wide">Description<textarea name="description"/></label><label>City<input name="city"/></label><label>State / region<input name="state"/></label><label>Country<input name="country"/></label><label>Joining<select name="membershipMode" defaultValue="invite_only"><option value="open">Open — public link can join</option><option value="approval_required">Approval required</option><option value="invite_only">Invite only</option></select></label><p className="admin-field-note is-wide">Only an open Hub can add people through its public /hub-slug link. Hub membership never grants Hub Leader permissions.</p><button className="admin-primary" disabled={busy}>{busy ? "Creating…" : "Create Hub"}</button>{message && <p className="admin-form-message is-wide" role="status">{message}</p>}</form></details>;
}
