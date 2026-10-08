import { CircleOfInfluenceAssessment } from "@/components/experiences/builder/CircleOfInfluenceAssessment";
import { notFound } from "next/navigation";
import { ActivatePurposeAssessment } from "@/components/experiences/builder/ActivatePurposeAssessment";
import { EthosAssessment } from "@/components/experiences/builder/EthosAssessment";
import { LaunchingWayfindersHubAssessment } from "@/components/experiences/builder/LaunchingWayfindersHubAssessment";
const route = { slug: "fixture", moduleKey: "fixture", lessonKey: "fixture", sectionKey: "fixture", blockKey: "fixture" };
export default async function NativeAssessmentPreview({ searchParams }: { searchParams: Promise<{ complete?: string; finished?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const filled = query.complete === "1" || query.finished === "1";
  const numericAnswers = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, 4]));
  const letterAnswers = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, "C"]));
  function data(answers: Record<string, number | string>) { return filled ? { answers, finished: query.finished === "1" ? { completedAt: "2026-10-02T12:00:00.000Z", answers } : null } : {}; }
  return <main className="wayfinder-dashboard"><h1>Native assessment previews</h1><CircleOfInfluenceAssessment initialData={{}} route={route} preview autoStart/><p>Fictitious data. Responses are not saved.</p><ActivatePurposeAssessment initialData={data(letterAnswers)} route={route} preview standalone/><EthosAssessment initialData={data(numericAnswers)} route={route} preview standalone/><LaunchingWayfindersHubAssessment initialData={data(numericAnswers)} route={route} preview standalone/></main>;
}
