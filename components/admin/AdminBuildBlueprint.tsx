"use client";

import { useState } from "react";
import type { AdminBlueprint } from "@/lib/admin/build-blueprints";
import { formatBuildBrief } from "@/lib/admin/build-blueprints";

const groups: Array<{ key: keyof AdminBlueprint; label: string }> = [
  { key: "currentState", label: "Current state" },
  { key: "coreObjects", label: "Core objects" },
  { key: "capabilities", label: "Capabilities" },
  { key: "views", label: "Views" },
  { key: "relationships", label: "Relationships" },
  { key: "permissions", label: "Permissions" },
  { key: "activityAndCommunication", label: "Activity & communication" },
  { key: "automations", label: "Automations" },
  { key: "agentReadiness", label: "Agent readiness" },
  { key: "dataModel", label: "Data model" },
  { key: "uxRequirements", label: "UX requirements" },
  { key: "futurePhases", label: "Future phases" },
  { key: "acceptanceCriteria", label: "Acceptance criteria" },
];

export function AdminBuildBlueprint({ blueprint }: { blueprint: AdminBlueprint }) {
  const [copied, setCopied] = useState(false);
  async function copyBrief() {
    await navigator.clipboard.writeText(formatBuildBrief(blueprint));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <section className="admin-build-blueprint" aria-labelledby={`blueprint-${blueprint.slug}`}>
    <header><div><p>Development only</p><h2 id={`blueprint-${blueprint.slug}`}>Build Blueprint</h2></div><div className="admin-blueprint-actions"><span className={`admin-blueprint-status is-${blueprint.status.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`}>{blueprint.status}</span><button type="button" onClick={copyBrief}>{copied ? "Copied" : "Copy Build Brief"}</button></div></header>
    <div className="admin-blueprint-intro"><div><span>Purpose</span><p>{blueprint.purpose}</p></div><div><span>Primary users</span><p>{blueprint.primaryUsers.join(" · ")}</p></div><div><span>Route</span><code>{blueprint.route}</code></div></div>
    <details><summary>Open comprehensive development plan</summary><div className="admin-blueprint-grid">{groups.map(({ key, label }) => { const values = blueprint[key] as string[]; return <article key={key}><h3>{label}</h3><ul>{values.map((value) => <li key={value}>{value}</li>)}</ul></article>; })}</div></details>
  </section>;
}
