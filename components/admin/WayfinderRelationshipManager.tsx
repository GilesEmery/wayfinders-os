"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Option = { id: string; name: string };
type Existing = { kind: "organization" | "hub" | "cohort" | "tag"; targetId: string; name: string; role: string };

export function WayfinderRelationshipManager({ participantId, organizations, hubs, cohorts, tags, existing }: { participantId: string; organizations: Option[]; hubs: Option[]; cohorts: Option[]; tags: Option[]; existing: Existing[] }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function send(body: Record<string, string>) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/wayfinders/${participantId}/relationships`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false); setMessage(response.ok ? "Relationship updated." : payload.error ?? "Unable to update relationship.");
    if (response.ok) router.refresh();
  }
  function submit(kind: Existing["kind"]) { return (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void send({ kind, targetId: String(data.get("targetId") ?? ""), role: String(data.get("role") ?? "member"), operation: "assign" }); }; }
  const groups: Array<{ kind: Existing["kind"]; label: string; options: Option[]; roles: Array<[string, string]> }> = [
    { kind: "organization", label: "Organization", options: organizations, roles: [["member", "Member"], ["leader", "Leader"], ["organization_admin", "Organization Admin"]] },
    { kind: "hub", label: "Hub", options: hubs, roles: [["member", "Member"], ["hub_leader", "Hub Leader"]] },
    { kind: "cohort", label: "Cohort", options: cohorts, roles: [["participant", "Participant"], ["facilitator", "Facilitator"]] },
    { kind: "tag", label: "Journey Classification", options: tags, roles: [["classification", "Classification"]] },
  ];
  return <div className="admin-relationship-manager">
    <div className="admin-relationship-list">{existing.length ? existing.map((item) => <div className="admin-record-row" key={`${item.kind}-${item.targetId}-${item.role}`}><div><strong>{item.name}</strong><span>{item.kind} · {item.role.replaceAll("_", " ")}</span></div><button className="admin-text-button" disabled={busy} onClick={() => void send({ kind: item.kind, targetId: item.targetId, role: item.role, operation: "remove" })} type="button">Remove</button></div>) : <p>No communities or journey classifications assigned.</p>}</div>
    <div className="admin-relationship-forms">{groups.map((group) => <form key={group.kind} onSubmit={submit(group.kind)}><strong>Add {group.label}</strong><select name="targetId" required defaultValue=""><option disabled value="">Choose {group.label}</option>{group.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{group.kind !== "tag" && <select name="role">{group.roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}<button className="admin-primary" disabled={busy || !group.options.length}>Add</button></form>)}</div>
    {message && <p className="admin-form-message" role="status">{message}</p>}
  </div>;
}
