"use client";

import { useState } from "react";

export function HubDefaultControl({ hubId, isDefault }: { hubId: string; isDefault: boolean }) {
  const [active, setActive] = useState(isDefault); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function choose() { setBusy(true); setMessage(""); const response = await fetch("/api/account/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ defaultHubId: hubId }) }); const payload = await response.json().catch(() => ({})) as { error?: string }; setBusy(false); if (response.ok) { setActive(true); setMessage("Default Hub updated."); } else setMessage(payload.error ?? "Unable to update your default Hub."); }
  return <div className="hub-default-control">{active ? <strong>This is your default Hub</strong> : <button disabled={busy} onClick={choose} type="button">{busy ? "Saving…" : "Make this my default Hub"}</button>}{message && <span role="status">{message}</span>}</div>;
}
