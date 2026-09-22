"use client";

import { useState, type FormEvent } from "react";
import type { PlatformAccount } from "@/lib/platform/auth";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

async function submitJson(path: string, method: "PATCH" | "POST" | "DELETE", body: Record<string, string>) {
  const response = await fetch(path, { method, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as PlatformAccount & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Unable to save your changes.");
  return payload;
}

type HubSettings = { hubs: Array<{ id: string; name: string; slug: string; membership_mode: string }>; membershipIds: string[]; defaultHubId: string | null };

export function AccountSettings({ account, hubSettings }: { account: PlatformAccount; hubSettings: HubSettings }) {
  const { setAccount } = useWayfindersAuth();
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [hubBusy, setHubBusy] = useState(false);
  const [hubMessage, setHubMessage] = useState("");
  const [membershipIds, setMembershipIds] = useState(hubSettings.membershipIds);
  const [defaultHubId, setDefaultHubId] = useState(hubSettings.defaultHubId);

  async function updateHub(method: "PATCH" | "POST" | "DELETE", hubId: string) {
    setHubBusy(true); setHubMessage("");
    try {
      const payload = await submitJson("/api/account/preferences", method, method === "PATCH" ? { defaultHubId: hubId } : { hubId });
      if (method === "POST") setMembershipIds((current) => [...new Set([...current, hubId])]);
      if (method === "DELETE") { setMembershipIds((current) => current.filter((id) => id !== hubId)); if (defaultHubId === hubId) setDefaultHubId(null); }
      if (method === "PATCH") setDefaultHubId(hubId);
      setHubMessage((payload as { message?: string }).message ?? "Your Hub settings have been updated.");
    } catch (error) { setHubMessage(error instanceof Error ? error.message : "Unable to update your Hub settings."); }
    finally { setHubBusy(false); }
  }

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
    <section className="account-settings-section account-hub-settings">
      <header><p className="platform-eyebrow">My Hub</p><h2>Hub connections</h2></header>
      <p className="account-section-copy">Choose the Wayfinders context you primarily belong to. Hub membership does not grant leadership permissions.</p>
      <div className="account-hub-list">{hubSettings.hubs.filter((hub) => membershipIds.includes(hub.id)).map((hub) => <article key={hub.id}><div><strong>{hub.name}</strong><span>{hub.id === defaultHubId ? "Primary Hub" : "Connected"}</span></div><div>{hub.id !== defaultHubId && <button disabled={hubBusy} onClick={() => void updateHub("PATCH", hub.id)} type="button">Make primary</button>}<button disabled={hubBusy} onClick={() => void updateHub("DELETE", hub.id)} type="button">Leave</button></div></article>)}{!membershipIds.length && <p className="account-field-note">You are not currently connected to a Hub.</p>}</div>
      {hubSettings.hubs.some((hub) => hub.membership_mode === "open" && !membershipIds.includes(hub.id)) && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void updateHub("POST", String(form.get("hubId") ?? "")); }}><label>Join an open Hub<select name="hubId" required defaultValue=""><option value="" disabled>Choose a Hub</option>{hubSettings.hubs.filter((hub) => hub.membership_mode === "open" && !membershipIds.includes(hub.id)).map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label><button disabled={hubBusy}>{hubBusy ? "Saving…" : "Connect to Hub"}</button></form>}
      {hubMessage && <p className="account-form-message" role="status">{hubMessage}</p>}
    </section>
  </div>;
}
