"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getParticipantProfile, saveParticipantProfile } from "@/lib/experiences/lmu/storage";
import { createParticipantSession } from "@/lib/experiences/lmu/persistence";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ParticipantEntryForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const profile = getParticipantProfile();
      if (!profile) return;
      setFirstName(profile.firstName);
      setEmail(profile.email);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const cleanName = firstName.trim();
  const cleanEmail = email.trim();
  const nameValid = cleanName.length > 0 && cleanName.length <= 80;
  const emailValid = cleanEmail.length <= 254 && EMAIL_PATTERN.test(cleanEmail);
  const valid = nameValid && emailValid;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    setSubmitting(true);
    setServerError("");
    try {
      await createParticipantSession({ firstName: cleanName, email: cleanEmail });
      saveParticipantProfile({ firstName: cleanName, email: cleanEmail });
      router.push("/experiences/life-mapping-u/choose");
    } catch {
      setServerError("We could not securely start your session. Please try again.");
      setSubmitting(false);
    }
  }

  return <form className="lmu-entry-form" noValidate onSubmit={submit}>
    <div>
      <label htmlFor="lmu-first-name">First Name</label>
      <input id="lmu-first-name" name="firstName" type="text" autoComplete="given-name" maxLength={80} required value={firstName} onChange={(event) => setFirstName(event.target.value)} aria-describedby={submitted && !nameValid ? "lmu-first-name-error" : undefined} aria-invalid={submitted && !nameValid} />
      {submitted && !nameValid ? <p className="lmu-field-error" id="lmu-first-name-error" role="alert">Enter your first name.</p> : null}
    </div>
    <div>
      <label htmlFor="lmu-email">Email Address</label>
      <input id="lmu-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={submitted && !emailValid ? "lmu-email-error" : undefined} aria-invalid={submitted && !emailValid} />
      {submitted && !emailValid ? <p className="lmu-field-error" id="lmu-email-error" role="alert">Enter a valid email address.</p> : null}
    </div>
    {serverError ? <p className="lmu-field-error" role="alert">{serverError}</p> : null}
    <button className="button button-primary" type="submit" disabled={submitting}><span>{submitting ? "Starting…" : "Next"}</span><span aria-hidden="true">→</span></button>
  </form>;
}
