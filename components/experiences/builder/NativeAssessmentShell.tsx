import type { ReactNode } from "react";

/** Shared presentation for the neutral Wayfinders assessments, including course launches. */
export function NativeAssessmentShell({ children, returnTo, showReturn }: { children: ReactNode; returnTo?: string | null; showReturn: boolean }) {
  return <div className="native-assessment-shell">
    {showReturn && <nav className="native-assessment-context" aria-label="Assessment navigation"><a href={returnTo ?? "/dashboard"}>← {returnTo ? "Back to course" : "My dashboard"}</a></nav>}
    {children}
  </div>;
}
