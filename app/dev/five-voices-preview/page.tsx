import { notFound } from "next/navigation";
import { FiveVoicesAssessment } from "@/components/experiences/builder/FiveVoicesAssessment";
import { FIVE_VOICES_QUESTIONS, shuffleFiveVoicesQuestions } from "@/lib/experiences/builder/five-voices";
export default async function FiveVoicesPreview({ searchParams }: { searchParams: Promise<{ finished?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const answers = Object.fromEntries(FIVE_VOICES_QUESTIONS.map(q => [q.key, ({ nurturer: 3, creative: 1.5, guardian: 2.5, connector: 2, pioneer: 1 } as const)[q.domain]]));
  return <main className="wayfinder-dashboard"><FiveVoicesAssessment preview autoStart initialOrder={shuffleFiveVoicesQuestions()} initialData={query.finished === "1" ? { answers, finished: { answers, completedAt: "2026-10-27T14:00:00Z" } } : {}} route={{ slug: "fixture", moduleKey: "fixture", lessonKey: "fixture", sectionKey: "fixture", blockKey: "fixture" }}/></main>;
}
