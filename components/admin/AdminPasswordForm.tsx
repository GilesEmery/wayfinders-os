"use client";

import { useState, type FormEvent } from "react";

export function AdminPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setBusy(false);
      return;
    }
    const body = { currentPassword: String(form.get("currentPassword") ?? ""), newPassword, confirmPassword };
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Unable to update the password.");
      return;
    }
    event.currentTarget.reset();
    setSuccess(true);
    setMessage("Your admin password has been changed.");
  }

  return <form className="admin-form admin-password-form" onSubmit={submit}>
    <label>Current Password<input name="currentPassword" type="password" minLength={8} required autoComplete="current-password" /></label>
    <label>New Password<input name="newPassword" type="password" minLength={8} required autoComplete="new-password" /></label>
    <label>Confirm New Password<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" /></label>
    {message && <p className={`admin-form-message${success ? " is-success" : ""}`} role="status">{message}</p>}
    <button className="admin-primary" disabled={busy}>{busy ? "PLEASE WAIT…" : "CHANGE PASSWORD"}</button>
  </form>;
}
