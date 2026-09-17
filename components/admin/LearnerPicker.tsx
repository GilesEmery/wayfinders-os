"use client";

import { useMemo, useState } from "react";

type Learner = Readonly<{ id: string; full_name: string | null; email: string | null; auth_user_id: string | null }>;

export function LearnerPicker({ learners }: { learners: readonly Learner[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? learners.filter((learner) => `${learner.full_name ?? ""} ${learner.email ?? ""}`.toLowerCase().includes(normalized)).slice(0, 30) : learners.slice(0, 30);
  }, [learners, query]);
  const selected = learners.find((learner) => learner.id === selectedId);
  const optionLabel = (learner: Learner) => `${learner.full_name || learner.email || "Unnamed Wayfinder"}${learner.email ? ` · ${learner.email}` : ""} · ${learner.auth_user_id ? "Account active" : "Not activated"}`;
  return <div className="admin-learner-picker"><label>Search Wayfinders<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" autoComplete="off"/></label><label>Wayfinder<select name="participant_id" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required><option value="" disabled>Choose a Wayfinder</option>{selected && !filtered.some((learner) => learner.id === selected.id) && <option value={selected.id}>{optionLabel(selected)}</option>}{filtered.map((learner) => <option value={learner.id} key={learner.id}>{optionLabel(learner)}</option>)}</select></label><small>{query && !filtered.length ? "No matching Wayfinders in the loaded list." : selected ? selected.auth_user_id ? "Account active · ready to sign in after enrollment." : "Not activated · enrollment is allowed, but sign-in requires account activation." : "Search by name or email, then choose one."}</small></div>;
}
