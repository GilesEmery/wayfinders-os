import { notFound } from "next/navigation";
import { ApestAssessment } from "@/components/experiences/builder/ApestAssessment";
import { APEST_QUESTIONS, shuffleApestQuestions } from "@/lib/experiences/builder/apest";
export default async function ApestPreview({ searchParams }: { searchParams: Promise<{ finished?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const answers = Object.fromEntries(APEST_QUESTIONS.map(q => [q.key, ({ A: 3, P: 1.5, E: 2.5, S: 2, T: 1 } as const)[q.domain]]));
  return <main className="wayfinder-dashboard"><ApestAssessment preview autoStart initialOrder={shuffleApestQuestions()} initialData={query.finished === "1" ? { answers, finished: { answers, completedAt: "2026-10-27T14:00:00Z" } } : {}} route={{ slug: "fixture", moduleKey: "fixture", lessonKey: "fixture", sectionKey: "fixture", blockKey: "fixture" }}/></main>;
}
