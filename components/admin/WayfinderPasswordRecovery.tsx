"use client";

import { useState } from "react";
import styles from "./WayfinderPasswordRecovery.module.css";

export function WayfinderPasswordRecovery({ participantId, name }: { participantId: string; name: string }) {
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function recover() {
    if (busy || !verified) return;
    setBusy(true); setMessage(""); setResetUrl("");
    try {
      const response = await fetch(`/api/admin/wayfinders/${encodeURIComponent(participantId)}/password-recovery`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identityVerified: verified }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to start password recovery.");
      if (payload.resetUrl) { setResetUrl(payload.resetUrl); setMessage("Temporary reset link ready. Share it only with the person whose identity you verified."); }
      else throw new Error("No reset link was returned. Please try again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to start password recovery."); }
    finally { setBusy(false); }
  }

  return <article className={styles.panel}>
    <h3>Password assistance</h3>
    <p>Help {name} choose a new password. If email is delayed, generate a temporary, single-use reset link and share it directly through a verified channel. The person chooses their own password.</p>
    <label><input type="checkbox" checked={verified} disabled={busy} onChange={(event) => setVerified(event.target.checked)} /> I have verified this person&apos;s identity.</label>
    <div className="admin-page-actions">
      <button type="button" className="admin-secondary-button" disabled={busy || !verified} onClick={recover}>{busy ? "Preparing…" : "Generate temporary reset link"}</button>
    </div>
    {message && <p role="status">{message}</p>}
    {resetUrl && <div>
      <label>Temporary reset link<textarea readOnly rows={3} value={resetUrl} onFocus={(event) => event.currentTarget.select()} /></label>
      <p>Use promptly; the link expires under the account recovery settings. A newer recovery request can replace this link. Do not open it yourself or save it in CRM notes.</p>
      <div className="admin-page-actions"><button type="button" className="admin-secondary-button" onClick={async () => {
        try { await navigator.clipboard.writeText(resetUrl); setMessage("Reset link copied."); }
        catch { setMessage("Select the reset link above and copy it manually."); }
      }}>Copy reset link</button><button type="button" className="admin-secondary-button" onClick={() => { setResetUrl(""); setMessage(""); }}>Hide link</button></div>
    </div>}
  </article>;
}
