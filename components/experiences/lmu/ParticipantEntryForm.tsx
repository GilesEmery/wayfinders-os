"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { bindAssessment, saveParticipantProfile } from "@/lib/experiences/lmu/storage";

type AccountContext = {
  participant: { first_name: string; full_name?: string | null; email: string };
  assessment: { id: string } | null;
};

type AccountErrorPayload = { error?: string; code?: string; email?: string };

class AccountRequestError extends Error {
  constructor(message: string, readonly payload: AccountErrorPayload) {
    super(message);
  }
}

async function accountRequest(path: string, body?: Record<string, string>) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as AccountContext & AccountErrorPayload;
  if (!response.ok) throw new AccountRequestError(payload.error || "Unable to continue.", payload);
  return payload;
}

export function ParticipantEntryForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [context, setContext] = useState<AccountContext | null>(null);
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [needsFullName, setNeedsFullName] = useState(false);

  useEffect(() => {
    let active = true;
    void accountRequest("/api/lmu/session").then((value) => {
      if (active) setContext(value);
    }).catch((error: unknown) => {
      if (active && error instanceof AccountRequestError && error.payload.code === "full_name_required") {
        setNeedsFullName(true);
      }
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  function continueWith(value: AccountContext) {
    setContext(value);
    saveParticipantProfile({ firstName: value.participant.first_name, email: value.participant.email });
    if (value.assessment) {
      bindAssessment(value.assessment.id);
      router.push("/experiences/life-mapping-u/choose");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setServerError("");
    try {
      const value = needsFullName
        ? await accountRequest("/api/lmu/session", { fullName: fullName.trim() })
        : mode === "signup"
        ? await accountRequest("/api/account/signup", { fullName: fullName.trim(), email: email.trim(), password, confirmPassword })
        : await accountRequest("/api/account/signin", { email: email.trim(), password });
      setNeedsFullName(false);
      continueWith(value);
    } catch (error) {
      if (error instanceof AccountRequestError && error.payload.code === "full_name_required") {
        setNeedsFullName(true);
        setPassword("");
        setConfirmPassword("");
        setServerError("");
        return;
      }
      setServerError(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return <div className="lmu-account-status" role="status">Checking your Wayfinders account…</div>;
  if (context) return <div className="lmu-account-status">
    <p className="eyebrow">Wayfinders OS Account</p>
    <h2>Welcome back, {context.participant.full_name || context.participant.first_name}.</h2>
    {context.assessment
      ? <button className="button button-primary" type="button" onClick={() => continueWith(context)}><span>Resume Life Mapping U</span><span aria-hidden="true">→</span></button>
      : <p>Your completed Life Mapping U assessment is saved in your account. A future retake must be started explicitly.</p>}
    <form action="/api/account/logout" method="post"><button className="story-cancel" type="submit">Sign Out</button></form>
  </div>;

  if (needsFullName) return <div className="lmu-account-panel">
    <form className="lmu-entry-form" noValidate onSubmit={submit}>
      <p className="eyebrow">Finish Account Setup</p>
      <h2>What is your full name?</h2>
      <p className="lmu-account-help">We found your Wayfinders OS account. Add your name once to create its participant profile.</p>
      <div><label htmlFor="wayfinders-profile-full-name">Full Name</label><input id="wayfinders-profile-full-name" autoComplete="name" autoFocus maxLength={160} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
      {serverError && <p className="lmu-field-error" role="alert">{serverError}</p>}
      <button className="button button-primary" disabled={submitting} type="submit"><span>{submitting ? "Please wait…" : "Continue"}</span><span aria-hidden="true">→</span></button>
    </form>
  </div>;

  return <div className="lmu-account-panel">
    <div className="lmu-account-tabs" aria-label="Wayfinders account access">
      <button aria-pressed={mode === "signup"} type="button" onClick={() => { setMode("signup"); setServerError(""); }}>Create Account</button>
      <button aria-pressed={mode === "signin"} type="button" onClick={() => { setMode("signin"); setServerError(""); }}>Sign In</button>
    </div>
    <form className="lmu-entry-form" noValidate onSubmit={submit}>
      <p className="eyebrow">Wayfinders OS Account</p>
      {mode === "signup" && <div><label htmlFor="wayfinders-full-name">Full Name</label><input id="wayfinders-full-name" autoComplete="name" maxLength={160} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>}
      <div><label htmlFor="wayfinders-email">Email Address</label><input id="wayfinders-email" autoComplete="email" maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div><label htmlFor="wayfinders-password">Password</label><input id="wayfinders-password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      {mode === "signup" && <div><label htmlFor="wayfinders-confirm-password">Confirm Password</label><input id="wayfinders-confirm-password" autoComplete="new-password" minLength={8} required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>}
      {serverError && <p className="lmu-field-error" role="alert">{serverError}</p>}
      <button className="button button-primary" disabled={submitting} type="submit"><span>{submitting ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}</span><span aria-hidden="true">→</span></button>
      {mode === "signin" && <p className="lmu-account-help">Password recovery email is not available during this alpha phase. Contact the Wayfinders team if you need help accessing your account.</p>}
    </form>
  </div>;
}
