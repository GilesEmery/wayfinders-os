import { notFound } from "next/navigation";
import { EmotionalHealthAssessment } from "@/components/experiences/builder/EmotionalHealthAssessment";
import { EMOTIONAL_HEALTH_QUESTIONS, shuffleEmotionalHealthQuestions } from "@/lib/experiences/builder/emotional-health";
export default async function EmotionalHealthPreview({ searchParams }: { searchParams: Promise<{ finished?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const answers = Object.fromEntries(EMOTIONAL_HEALTH_QUESTIONS.map(q => [q.key, ({ self_awareness: 5, self_management: 3, social_awareness: 2, relationship_management: 4 } as const)[q.domain]]));
  return <main className="wayfinder-dashboard"><EmotionalHealthAssessment preview autoStart initialOrder={shuffleEmotionalHealthQuestions()} initialData={query.finished === "1" ? { answers, finished: { answers, completedAt: "2026-10-27T14:00:00Z" } } : {}} route={{ slug: "fixture", moduleKey: "fixture", lessonKey: "fixture", sectionKey: "fixture", blockKey: "fixture" }}/></main>;
}
