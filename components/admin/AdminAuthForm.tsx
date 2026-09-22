"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Mode = "login" | "reset";
export function AdminAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (mode === "reset" && password !== String(form.get("confirmPassword") ?? "")) { setMessage("Passwords do not match."); setBusy(false); return; }
    const endpoint = mode === "reset" ? "reset-password" : mode;
    const response = await fetch(`/api/admin/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(data.error ?? "Unable to complete this request."); return; }
    router.push("/admin"); router.refresh();
  }
  const title = { login: "Admin sign in", reset: "Choose a new password" }[mode];
  return <main className="admin-auth-page"><section className="admin-auth-panel"><p className="admin-kicker">Purpose OS</p><h1>{title}</h1><p className="admin-auth-intro">Secure access for authorized Wayfinders administrators.</p><form onSubmit={submit} className="admin-form">
    {mode !== "reset" && <label>Email Address<input name="email" type="email" required autoComplete="email" /></label>}
    <label>Password<input name="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
    {mode === "reset" && <label>Confirm Password<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" /></label>}
    {message && <p className="admin-form-message" role="status">{message}</p>}
    <button className="admin-primary" disabled={busy}>{busy ? "PLEASE WAIT…" : mode === "login" ? "SIGN IN" : "SET NEW PASSWORD"}</button>
  </form><nav className="admin-auth-links">{mode === "login" ? <Link href="/account/forgot-password">Forgot your password?</Link> : <Link href="/admin/login">Return to sign in</Link>}</nav></section></main>;
}
