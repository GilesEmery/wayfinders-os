"use client";

import { useState } from "react";

type Hub = Readonly<{ id: string; name: string }>;
type Entitlement = Readonly<{ entitlement_key: string; display_name: string; description: string }>;
type RoleEntitlement = Readonly<{ role_key: string; entitlement_key: string }>;
type EntitlementOverride = Readonly<{ entitlement_key: string; effect: string }>;

export function WayfinderAuthorityManager({ participantId, participantName, accountActive, actorRole, isSelf, administratorRole, administratorActive, courseCreatorActive, hubs, leaderHubIds, entitlements, roleEntitlements, entitlementOverrides }: {
  participantId: string; participantName: string; accountActive: boolean; actorRole: "admin" | "super_admin"; isSelf: boolean;
  administratorRole: string | null; administratorActive: boolean; courseCreatorActive: boolean; hubs: Hub[]; leaderHubIds: string[];
  entitlements: Entitlement[]; roleEntitlements: RoleEntitlement[]; entitlementOverrides: EntitlementOverride[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const leaders = new Set(leaderHubIds);
  const protectedSuperAdmin = administratorRole === "super_admin";
  const canManageAdmin = actorRole === "super_admin" && !isSelf && !protectedSuperAdmin && accountActive;
  const inheritedRoles = new Set(["member", ...(administratorActive && administratorRole ? [administratorRole] : []), ...(courseCreatorActive ? ["course_creator"] : []), ...(leaderHubIds.length ? ["hub_leader"] : [])]);
  const inheritedEntitlements = new Set(roleEntitlements.filter((item) => inheritedRoles.has(item.role_key)).map((item) => item.entitlement_key));
  const overrideByKey = new Map(entitlementOverrides.map((item) => [item.entitlement_key, item.effect]));

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key); setMessage("");
    const response = await fetch(`/api/admin/wayfinders/${participantId}/authority`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setBusy(null);
    if (!response.ok) { setMessage(payload.error ?? "Unable to change authority."); return; }
    window.location.reload();
  }

  async function mutate(role: "admin" | "hub_leader", enabled: boolean, hubId?: string) {
    const prompt = role === "admin"
      ? enabled ? `Grant Administrator Access?\n\nThis gives ${participantName} platform-wide administrative access to PurposeOS. Only Super Admins can grant or remove administrator access.` : `Remove Administrator Access?\n\n${participantName} will retain their PurposeOS account and participant data, but will no longer have administrator access.`
      : `${enabled ? "Grant" : "Remove"} Hub Leader authority for this Hub?`;
    if (window.confirm(prompt)) await post({ role, enabled, hubId }, `${role}:${hubId ?? "global"}`);
  }

  return <div className="crm-authority-manager">
    <article>
      <header><div><h3>Platform Access</h3><p>Roles establish defaults; server permissions authorize actions.</p></div></header>
      <div className="crm-authority-platform-roles">
        <label className="crm-authority-toggle"><input type="checkbox" checked={accountActive} disabled/><span>Member</span></label>
        <label className="crm-authority-toggle"><input type="checkbox" checked={administratorActive} disabled={!canManageAdmin || busy !== null} onChange={(event) => void mutate("admin", event.target.checked)}/><span>Administrator</span></label>
        <label className="crm-authority-toggle"><input type="checkbox" checked={courseCreatorActive} disabled={actorRole !== "super_admin" || isSelf || !accountActive || busy !== null} onChange={(event) => { const enabled = event.target.checked; if (window.confirm(`${enabled ? "Grant" : "Remove"} Course Creator access for ${participantName}?`)) void post({ role: "course_creator", enabled }, "role:course_creator"); }}/><span>Course Creator</span></label>
        <label className="crm-authority-toggle"><input type="checkbox" checked={leaderHubIds.length > 0} disabled/><span>Hub Leader (scoped below)</span></label>
      </div>
      {!accountActive && <p>This Wayfinder must activate their PurposeOS account before receiving authority.</p>}
      {protectedSuperAdmin && <p>Super Admin authority is protected and cannot be changed here.</p>}
      {actorRole !== "super_admin" && <p>Only Super Admins can change administrator access, Course Creator access, or individual entitlements.</p>}
      {isSelf && actorRole === "super_admin" && <p>Your own global role access cannot be changed from your profile.</p>}
    </article>
    <article>
      <header><div><h3>Hub Leadership</h3><p>Hub membership and scoped leadership authority remain separate.</p></div></header>
      <div className="crm-authority-hubs">{hubs.map((hub) => { const enabled = leaders.has(hub.id); return <label key={hub.id}><span><strong>{hub.name}</strong><small>{enabled ? "Hub Leader" : "Not a Hub Leader"}</small></span><input type="checkbox" checked={enabled} disabled={!accountActive || busy !== null} onChange={(event) => void mutate("hub_leader", event.target.checked, hub.id)}/></label>; })}{!hubs.length && <p>No active Hubs are available.</p>}</div>
    </article>
    {actorRole === "super_admin" && <article className="crm-entitlement-overrides">
      <header><div><h3>Entitlements</h3><p>Explicit deny outranks allow and inherited role defaults. “Inherited” removes the individual exception.</p></div></header>
      <div>{entitlements.map((entitlement) => { const override = overrideByKey.get(entitlement.entitlement_key) ?? ""; const inherited = inheritedEntitlements.has(entitlement.entitlement_key); return <label key={entitlement.entitlement_key}><span><strong>{entitlement.display_name}</strong><small>{inherited ? "Inherited: allowed" : "Inherited: unavailable"}</small></span><select aria-label={`${entitlement.display_name} override`} value={override} disabled={!accountActive || busy !== null} onChange={(event) => void post({ assignmentType: "entitlement_override", entitlementKey: entitlement.entitlement_key, effect: event.target.value || null }, `entitlement:${entitlement.entitlement_key}`)}><option value="">Inherited</option><option value="allow">Allow</option><option value="deny">Deny</option></select></label>; })}</div>
    </article>}
    {message && <p className="admin-form-message" role="alert">{message}</p>}
  </div>;
}
