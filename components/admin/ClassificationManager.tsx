"use client";

import { useState, type FormEvent } from "react";

type Classification = { id: string; slug: string; name: string; description: string | null; category: string; status: string };

export function ClassificationManager({ classifications }: { classifications: Classification[] }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function mutate(payload: Record<string, string>) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/classifications", { method: payload.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false); setMessage(response.ok ? "Classification saved." : result.error ?? "Unable to save classification.");
    if (response.ok) window.location.reload();
  }
  return <div className="admin-definition-manager">
    <form className="admin-inline-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate({ name: String(form.get("name") ?? ""), description: String(form.get("description") ?? ""), category: String(form.get("category") ?? "journey") }); }}>
      <label>Name<input maxLength={120} name="name" required/></label>
      <label>Description<input name="description"/></label>
      <label>Category<select defaultValue="journey" name="category"><option value="journey">Journey</option><option value="program">Program</option><option value="relationship">Relationship</option><option value="crm">CRM</option></select></label>
      <button className="admin-primary" disabled={busy}>Create classification</button>
    </form>
    <div className="admin-definition-list">{classifications.map((item) => <form key={item.id} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate({ id: item.id, name: String(form.get("name") ?? ""), description: String(form.get("description") ?? ""), status: item.status }); }}>
      <div><code>{item.slug}</code><span>{item.category}</span></div>
      <label>Display name<input defaultValue={item.name} maxLength={120} name="name" required/></label>
      <label>Description<input defaultValue={item.description ?? ""} name="description"/></label>
      <div className="admin-definition-actions"><button className="admin-primary" disabled={busy} type="submit">Save</button><button className="admin-text-button" disabled={busy} onClick={() => void mutate({ id: item.id, name: item.name, description: item.description ?? "", status: item.status === "archived" ? "active" : "archived" })} type="button">{item.status === "archived" ? "Reactivate" : "Archive"}</button></div>
    </form>)}</div>
    {message ? <p className="admin-form-message" role="status">{message}</p> : null}
  </div>;
}
