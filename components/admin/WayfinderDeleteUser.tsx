"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function WayfinderDeleteUser({ participantId, name, email }: { participantId: string; name: string; email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmationEmail.trim().toLowerCase() !== email.toLowerCase()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/wayfinders/${encodeURIComponent(participantId)}/delete`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmationEmail }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to delete this user.");
      router.replace("/admin/users"); router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to delete this user."); setBusy(false);
    }
  }
  return <article className="crm-delete-user"><h3>Delete user</h3><p>Permanently remove {name}&apos;s login, profile, memberships, saved responses, assessments, notes, and authored chat messages. This cannot be undone.</p>{confirming ? <form onSubmit={remove}><label htmlFor={`delete-email-${participantId}`}>Type {email} to confirm</label><input id={`delete-email-${participantId}`} type="email" autoComplete="off" value={confirmationEmail} disabled={busy} onChange={(event) => setConfirmationEmail(event.target.value)}/>{error && <p role="alert">{error}</p>}<div className="admin-page-actions"><button className="admin-danger" type="submit" disabled={busy || confirmationEmail.trim().toLowerCase() !== email.toLowerCase()}>{busy ? "Deleting…" : "Permanently delete user"}</button><button className="admin-secondary" type="button" disabled={busy} onClick={() => { setConfirming(false); setConfirmationEmail(""); setError(""); }}>Cancel</button></div></form> : <button className="admin-danger" type="button" onClick={() => setConfirming(true)}>Delete user…</button>}</article>;
}
