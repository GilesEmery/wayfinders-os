"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWayfindersAuth } from "@/components/platform/WayfindersAuthProvider";
import { bindAssessment, saveParticipantProfile } from "@/lib/experiences/lmu/storage";

type AccountContext = {
  participant: { first_name: string; full_name?: string | null; email: string };
  assessment: { id: string } | null;
  createdAssessment: boolean;
};
type AccountErrorPayload = { error?: string; code?: string };

async function sessionRequest(fullName?: string) {
  const response = await fetch("/api/lmu/session", {
    method: fullName ? "POST" : "GET",
    credentials: "same-origin",
    headers: fullName ? { "content-type": "application/json" } : undefined,
    body: fullName ? JSON.stringify({ fullName }) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as AccountContext & AccountErrorPayload;
  if (!response.ok) throw Object.assign(new Error(payload.error || "Unable to continue."), { code: payload.code });
  return payload;
}

export function ParticipantEntryForm() {
  const router = useRouter();
  const { authenticated } = useWayfindersAuth();
  const [context, setContext] = useState<AccountContext | null>(null);
  const [checking, setChecking] = useState(true);
  const [needsFullName, setNeedsFullName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const continueWith = useCallback((value: AccountContext) => {
    saveParticipantProfile({ firstName: value.participant.first_name, email: value.participant.email });
    if (value.assessment) {
      bindAssessment(value.assessment.id);
      router.push("/experiences/life-mapping-u/original/modules");
    }
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    void sessionRequest().then((value) => {
      if (!active) return;
      setContext(value);
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof Error && "code" in reason && reason.code === "full_name_required") setNeedsFullName(true);
      else setError(reason instanceof Error ? reason.message : "Unable to prepare Life Mapping U.");
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [authenticated]);

  async function finishProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const value = await sessionRequest(fullName.trim());
      setContext(value);
      setNeedsFullName(false);
      continueWith(value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue.");
    } finally { setSubmitting(false); }
  }

  if (checking) return <div className="lmu-account-status" role="status">Preparing Life Mapping U…</div>;

  if (needsFullName) return <div className="lmu-account-panel">
    <form className="lmu-entry-form" noValidate onSubmit={finishProfile}>
      <p className="eyebrow">Finish Profile Setup</p>
      <h2>What is your full name?</h2>
      <p className="lmu-account-help">Add your name once to connect this experience to your Wayfinders OS profile.</p>
      <div><label htmlFor="wayfinders-profile-full-name">Full Name</label><input id="wayfinders-profile-full-name" autoComplete="name" autoFocus maxLength={160} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
      {error && <p className="lmu-field-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={submitting} type="submit"><span>{submitting ? "Please wait…" : "Continue"}</span><span aria-hidden="true">→</span></button>
    </form>
  </div>;

  if (!context) return <div className="lmu-account-status" role={error ? "alert" : "status"}>{error || "Preparing Life Mapping U…"}</div>;

  return <div className="lmu-account-status">
    <p className="eyebrow">Life Mapping U</p>
    <h2>Welcome, {context.participant.full_name || context.participant.first_name}.</h2>
    {context.assessment
      ? <button className="button button-primary" type="button" onClick={() => continueWith(context)}>
          <span>{context.createdAssessment ? "Start Life Mapping U" : "Continue Life Mapping U"}</span>
          <span aria-hidden="true">→</span>
        </button>
      : <p>Your completed assessment is saved. A future retake must be started explicitly.</p>}
  </div>;
}
