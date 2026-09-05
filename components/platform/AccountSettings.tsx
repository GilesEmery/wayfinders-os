"use client";

import { useState, type FormEvent } from "react";
import type { PlatformAccount } from "@/lib/platform/auth";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

async function submitJson(path: string, method: "PATCH" | "POST", body: Record<string, string>) {
  const response = await fetch(path, { method, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as PlatformAccount & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Unable to save your changes.");
  return payload;
}

export function AccountSettings({ account }: { account: PlatformAccount }) {
  const { setAccount } = useWayfindersAuth();
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true); setProfileMessage(""); setProfileSuccess(false);
    const form = new FormData(event.currentTarget);
    try {
      const updated = await submitJson("/api/account", "PATCH", { fullName: String(form.get("fullName") ?? "") });
      setAccount(updated);
      setProfileSuccess(true); setProfileMessage("Your profile has been updated.");
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "Unable to update your profile."); }
    finally { setProfileBusy(false); }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true); setPasswordMessage(""); setPasswordSuccess(false);
    const form = new FormData(event.currentTarget);
    try {
      await submitJson("/api/account/password", "POST", {
        newPassword: String(form.get("newPassword") ?? ""),
        confirmPassword: String(form.get("confirmPassword") ?? ""),
      });
      event.currentTarget.reset();
      setPasswordSuccess(true); setPasswordMessage("Your password has been changed.");
    } catch (error) { setPasswordMessage(error instanceof Error ? error.message : "Unable to update your password."); }
    finally { setPasswordBusy(false); }
  }

  return <div className="account-settings">
    <section className="account-settings-section">
      <header><p className="platform-eyebrow">Profile</p><h2>Your details</h2></header>
      <form onSubmit={updateProfile}>
        <label>Full Name<input defaultValue={account.fullName} maxLength={160} name="fullName" required autoComplete="name" /></label>
        <label>Email Address<input value={account.email} readOnly type="email" /></label>
        <p className="account-field-note">Email changes are not available during this alpha phase.</p>
        {profileMessage && <p className={`account-form-message${profileSuccess ? " is-success" : ""}`} role="status">{profileMessage}</p>}
        <button disabled={profileBusy} type="submit">{profileBusy ? "Saving…" : "Save Profile"}</button>
      </form>
    </section>
    <section className="account-settings-section">
      <header><p className="platform-eyebrow">Password</p><h2>Change password</h2></header>
      <form onSubmit={updatePassword}>
        <label>New Password<input minLength={8} name="newPassword" required type="password" autoComplete="new-password" /></label>
        <label>Confirm New Password<input minLength={8} name="confirmPassword" required type="password" autoComplete="new-password" /></label>
        {passwordMessage && <p className={`account-form-message${passwordSuccess ? " is-success" : ""}`} role="status">{passwordMessage}</p>}
        <button disabled={passwordBusy} type="submit">{passwordBusy ? "Updating…" : "Change Password"}</button>
      </form>
    </section>
  </div>;
}
