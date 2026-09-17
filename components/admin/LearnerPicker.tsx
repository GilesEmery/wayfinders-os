"use client";

import { useEffect, useState } from "react";

type Learner = Readonly<{ id: string; full_name: string | null; email: string | null; auth_user_id: string | null }>;

export function LearnerPicker({ learners, experienceId }: { learners: readonly Learner[]; experienceId: string }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [results, setResults] = useState<readonly Learner[]>(learners);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/admin/trainings/${encodeURIComponent(experienceId)}/learners?q=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        const payload = await response.json() as { learners?: Learner[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Search failed.");
        setResults(payload.learners ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [experienceId, query]);

  const selected = selectedLearner ?? [...learners, ...results].find((learner) => learner.id === selectedId);
  const optionLabel = (learner: Learner) => `${learner.full_name || learner.email || "Unnamed Wayfinder"}${learner.email ? ` · ${learner.email}` : ""} · ${learner.auth_user_id ? "Account active" : "Not activated"}`;
  const updateQuery = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(learners);
      setLoading(false);
      setSearchError("");
    }
  };

  return <div className="admin-learner-picker">
    <label>Search Wayfinders<input type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Enter at least 2 letters of a name or email" autoComplete="off"/></label>
    <label>Wayfinder<select name="participant_id" value={selectedId} onChange={(event) => { const id = event.target.value; setSelectedId(id); setSelectedLearner(results.find((learner) => learner.id === id) ?? null); }} required>
      <option value="" disabled>{loading ? "Searching…" : "Choose a Wayfinder"}</option>
      {selected && !results.some((learner) => learner.id === selected.id) && <option value={selected.id}>{optionLabel(selected)}</option>}
      {results.map((learner) => <option value={learner.id} key={learner.id}>{optionLabel(learner)}</option>)}
    </select></label>
    <small aria-live="polite">{searchError || (loading ? "Searching all Wayfinders…" : query.trim().length === 1 ? "Enter one more character to search." : query && !results.length ? "No matching Wayfinders found." : selected ? selected.auth_user_id ? "Account active · ready to sign in after enrollment." : "Not activated · enrollment is allowed, but sign-in requires account activation." : query ? `${results.length} matching Wayfinder${results.length === 1 ? "" : "s"} found.` : "Search by name or email, then choose one.")}</small>
  </div>;
}
