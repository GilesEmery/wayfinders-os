"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { PURPOSEOS_MIN_PASSWORD_LENGTH } from "@/lib/platform/password";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

type ApiPayload = { error?: string; message?: string };

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") ?? "").trim().toLowerCase() }),
      });
      const payload = await response.json().catch(() => ({})) as ApiPayload;
      setMessage(payload.message || payload.error || "Unable to send reset instructions.");
      setSuccess(response.ok);
    } catch { setMessage("Unable to reach Purpose OS. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <RecoveryShell title="Reset your password." intro="Enter the email address for your Purpose OS account.">
    <form onSubmit={submit}>
      <label>Email Address<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
      {message && <div className={`wayfinders-auth-error${success ? " is-success" : ""}`} role="status"><p>{message}</p></div>}
      <button className="wayfinders-auth-submit" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset instructions"}<span aria-hidden="true">→</span></button>
      <Link className="wayfinders-auth-secondary" href="/">Back to Sign In</Link>
    </form>
  </RecoveryShell>;
}

export function ResetPasswordForm({ valid }: { valid: boolean }) {
  const router = useRouter();
  const { setAccount } = useWayfindersAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/reset-password", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") }),
      });
      const payload = await response.json().catch(() => ({})) as ApiPayload;
      setMessage(payload.message || payload.error || "Unable to update your password.");
      if (response.ok) { setSuccess(true); event.currentTarget.reset(); }
    } catch { setMessage("Unable to reach Purpose OS. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  if (!valid) return <RecoveryShell title="Reset link unavailable." intro="This password reset link is invalid or has expired.">
    <Link className="wayfinders-auth-submit" href="/account/forgot-password">Request a new reset link<span aria-hidden="true">→</span></Link>
    <Link className="wayfinders-auth-secondary" href="/">Back to Sign In</Link>
  </RecoveryShell>;

  if (success) return <RecoveryShell title="Password updated." intro="Your password has been updated.">
    <button className="wayfinders-auth-submit" onClick={() => { setAccount(null); router.push("/"); router.refresh(); }} type="button">Sign In<span aria-hidden="true">→</span></button>
  </RecoveryShell>;

  return <RecoveryShell title="Choose a new password." intro={`Use at least ${PURPOSEOS_MIN_PASSWORD_LENGTH} characters.`}>
    <form onSubmit={submit}>
      <label>New Password<input autoComplete="new-password" minLength={PURPOSEOS_MIN_PASSWORD_LENGTH} name="newPassword" required type="password" /></label>
      <label>Confirm New Password<input autoComplete="new-password" minLength={PURPOSEOS_MIN_PASSWORD_LENGTH} name="confirmPassword" required type="password" /></label>
      {message && <div className="wayfinders-auth-error" role="alert"><p>{message}</p></div>}
      <button className="wayfinders-auth-submit" disabled={busy} type="submit">{busy ? "Updating…" : "Update password"}<span aria-hidden="true">→</span></button>
    </form>
  </RecoveryShell>;
}

function RecoveryShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main className="purposeos-recovery-page"><section className="wayfinders-auth-modal">
    <p className="wayfinders-auth-brand">Purpose OS <span>by Wayfinders</span></p>
    <h1>{title}</h1><p className="wayfinders-auth-intro">{intro}</p>{children}
  </section></main>;
}
