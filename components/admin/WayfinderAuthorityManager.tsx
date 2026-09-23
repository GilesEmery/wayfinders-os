"use client";

import { useState } from "react";

type Hub = Readonly<{ id: string; name: string }>;

export function WayfinderAuthorityManager({ participantId, participantName, accountActive, actorRole, isSelf, administratorRole, administratorActive, hubs, leaderHubIds }: {
  participantId: string;
  participantName: string;
  accountActive: boolean;
  actorRole: "admin" | "super_admin";
  isSelf: boolean;
  administratorRole: string | null;
  administratorActive: boolean;
  hubs: Hub[];
  leaderHubIds: string[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const leaders = new Set(leaderHubIds);
  const protectedSuperAdmin = administratorRole === "super_admin";
  const canManageAdmin = actorRole === "super_admin" && !isSelf && !protectedSuperAdmin && accountActive;

  async function mutate(role: "admin" | "hub_leader", enabled: boolean, hubId?: string) {
    const key = `${role}:${hubId ?? "global"}`;
    const prompt = role === "admin"
      ? enabled
        ? `Grant Administrator Access?\n\nThis gives ${participantName} platform-wide administrative access to PurposeOS. Only Super Admins can grant or remove administrator access.`
        : `Remove Administrator Access?\n\n${participantName} will retain their PurposeOS account and participant data, but will no longer have administrator access.`
      : `${enabled ? "Grant" : "Remove"} Hub Leader authority for this Hub?`;
    if (!window.confirm(prompt)) return;
    setBusy(key); setMessage("");
    const response = await fetch(`/api/admin/wayfinders/${participantId}/authority`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, enabled, hubId }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setBusy(null);
    if (!response.ok) { setMessage(payload.error ?? "Unable to change authority."); return; }
    window.location.reload();
  }

  return <div className="crm-authority-manager">
    <article>
      <header><div><h3>Platform Access</h3><p>Administrator authority is platform-wide.</p></div><label className="crm-authority-toggle"><input type="checkbox" checked={administratorActive} disabled={!canManageAdmin || busy !== null} onChange={(event) => void mutate("admin", event.target.checked)}/><span>Administrator</span></label></header>
      {!accountActive && <p>This Wayfinder must activate their PurposeOS account before receiving authority.</p>}
      {protectedSuperAdmin && <p>Super Admin authority is protected and cannot be changed here.</p>}
      {actorRole !== "super_admin" && <p>Only Super Admins can change administrator access.</p>}
      {isSelf && actorRole === "super_admin" && <p>Your own administrator access cannot be changed from your profile.</p>}
    </article>
    <article>
      <header><div><h3>Hub Leadership</h3><p>Hub membership and scoped leadership authority remain separate.</p></div></header>
      <div className="crm-authority-hubs">{hubs.map((hub) => { const enabled = leaders.has(hub.id); return <label key={hub.id}><span><strong>{hub.name}</strong><small>{enabled ? "Hub Leader" : "Not a Hub Leader"}</small></span><input type="checkbox" checked={enabled} disabled={!accountActive || busy !== null} onChange={(event) => void mutate("hub_leader", event.target.checked, hub.id)}/></label>; })}{!hubs.length && <p>No active Hubs are available.</p>}</div>
    </article>
    {message && <p className="admin-form-message" role="alert">{message}</p>}
  </div>;
}
