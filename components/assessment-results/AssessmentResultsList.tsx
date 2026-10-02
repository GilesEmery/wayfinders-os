import Link from "next/link";
import type { AssessmentResultSummary } from "@/lib/assessment-results";

function date(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(value)); }

export function AssessmentResultsList({ results, href }: { results: AssessmentResultSummary[]; href: (result: AssessmentResultSummary) => string }) {
  if (!results.length) return <div className="assessment-results-empty"><h2>No completed results yet</h2><p>Completed Guided Experiences will appear here. Drafts and unfinished responses remain private and are not shown as results.</p></div>;
  return <div className="assessment-results-list">{results.map((result) => <article key={`${result.kind}-${result.id}`}><div><span>Guided Experience</span><h2>{result.name}</h2><p>Completed <time dateTime={result.completedAt}>{date(result.completedAt)}</time></p></div><Link href={href(result)}>View result</Link></article>)}</div>;
}
