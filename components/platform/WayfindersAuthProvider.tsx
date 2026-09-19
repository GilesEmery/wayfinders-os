"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { PlatformAccount } from "@/lib/platform/auth";

type AuthMode = "signin" | "signup";
type AuthContextValue = {
  account: PlatformAccount | null;
  authenticated: boolean;
  openAuth: (destination?: string, mode?: AuthMode) => void;
  requireAuth: (destination: string) => void;
  setAccount: (account: PlatformAccount | null) => void;
};
type ErrorPayload = { error?: string; code?: string; participant?: { full_name?: string | null; first_name: string; email: string } };

const AuthContext = createContext<AuthContextValue | null>(null);

function safeDestination(value: string | undefined, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function WayfindersAuthProvider({ children, initialAccount }: { children: ReactNode; initialAccount: PlatformAccount | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState(initialAccount);
  const authenticated = Boolean(account);
  const [open, setOpen] = useState(false);
  const [required, setRequired] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [destination, setDestination] = useState("/");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let supabase;
    try { supabase = createBrowserSupabaseClient(); } catch { return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAccount(null);
        return;
      }
      void fetch("/api/account", { credentials: "same-origin", cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<PlatformAccount> : null)
        .then((nextAccount) => { if (nextAccount) setAccount(nextAccount); });
    });
    return () => subscription.unsubscribe();
  }, []);

  const openAuth = useCallback((requestedDestination?: string, requestedMode: AuthMode = "signin") => {
    setDestination(safeDestination(requestedDestination, pathname || "/"));
    setMode(requestedMode);
    setError("");
    setErrorCode("");
    setRequired(false);
    setOpen(true);
  }, [pathname]);

  const requireAuth = useCallback((requestedDestination: string) => {
    setDestination(safeDestination(requestedDestination, pathname || "/"));
    setMode("signin");
    setError("");
    setErrorCode("");
    setRequired(true);
    setOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => emailInput.current?.focus(), 0);
    return () => { document.body.style.overflow = priorOverflow; };
  }, [open, mode]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setErrorCode("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setErrorCode("");
    try {
      const response = await fetch(`/api/account/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { fullName, email, password, confirmPassword } : { email, password, fullName }),
      });
      const payload = await response.json().catch(() => ({})) as ErrorPayload;
      if (!response.ok) {
        setError(payload.error || "Unable to continue.");
        setErrorCode(payload.code || "");
        return;
      }
      const name = payload.participant?.full_name?.trim() || payload.participant?.first_name || email.split("@")[0];
      const accountResponse = await fetch("/api/account", { credentials: "same-origin", cache: "no-store" });
      const refreshedAccount = accountResponse.ok ? await accountResponse.json() as PlatformAccount : null;
      setAccount(refreshedAccount ?? { email: payload.participant?.email || email, fullName: payload.participant?.full_name || fullName, displayName: name, isAdmin: false, adminRole: null });
      setRequired(false);
      setOpen(false);
      setPassword("");
      setConfirmPassword("");
      if (destination !== pathname) router.push(destination);
      else router.refresh();
    } catch {
      setError("Unable to reach Purpose OS. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <AuthContext.Provider value={{ account, authenticated, openAuth, requireAuth, setAccount }}>
    {children}
    {open && <div className="wayfinders-auth-backdrop" onMouseDown={(event) => {
      if (!required && event.target === event.currentTarget) setOpen(false);
    }} onKeyDown={(event) => { if (!required && event.key === "Escape") setOpen(false); }}>
      <section aria-labelledby="wayfinders-auth-title" aria-modal="true" className="wayfinders-auth-modal" role="dialog">
        {!required && <button aria-label="Close authentication dialog" className="wayfinders-auth-close" onClick={() => setOpen(false)} type="button">×</button>}
        <p className="wayfinders-auth-brand">Purpose OS <span>by Wayfinders</span></p>
        <div className="wayfinders-auth-tabs" role="tablist" aria-label="Account access">
          <button aria-selected={mode === "signin"} onClick={() => switchMode("signin")} role="tab" type="button">Sign In</button>
          <button aria-selected={mode === "signup"} onClick={() => switchMode("signup")} role="tab" type="button">Create Account</button>
        </div>
        <h2 id="wayfinders-auth-title">{mode === "signin" ? "Welcome back." : "Create your account."}</h2>
        <p className="wayfinders-auth-intro">One account for Wayfinders experiences, tools, and resources.</p>
        <form onSubmit={submit}>
          {(mode === "signup" || errorCode === "full_name_required") && <label>Full Name<input autoComplete="name" maxLength={160} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}
          <label>Email Address<input ref={emailInput} autoComplete="email" maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {mode === "signin" && <Link className="wayfinders-auth-forgot" href="/account/forgot-password" onClick={() => setOpen(false)}>Forgot password?</Link>}
          {mode === "signup" && <label>Confirm Password<input autoComplete="new-password" minLength={8} required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
          {error && <div className="wayfinders-auth-error" role="alert"><p>{error}</p>{errorCode === "account_exists" && <button onClick={() => switchMode("signin")} type="button">Sign in instead</button>}</div>}
          <button className="wayfinders-auth-submit" disabled={submitting} type="submit">{submitting ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}<span aria-hidden="true">→</span></button>
          <button className="wayfinders-auth-secondary" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} type="button">{mode === "signin" ? "Create Account" : "Already have an account? Sign In"}</button>
          {mode === "signin" && <p className="wayfinders-auth-alpha-note">Password recovery email is not available during this alpha phase. Contact the Wayfinders team for account access help.</p>}
        </form>
      </section>
    </div>}
  </AuthContext.Provider>;
}

export function useWayfindersAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useWayfindersAuth must be used within WayfindersAuthProvider.");
  return value;
}
