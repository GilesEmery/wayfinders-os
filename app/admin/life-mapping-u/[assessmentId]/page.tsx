import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
const sections = [
  "success_stories",
  "transferable_skills",
  "teammates",
  "supervisor",
  "values",
  "growth",
  "location",
  "x_factor",
  "salary",
  "motivator_rankings",
];
function ResultView({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return <p>No finalized result.</p>;
  return (
    <dl className="admin-result-data">
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
        <div key={key}>
          <dt>{humanize(key)}</dt>
          <dd>
            {typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean"
              ? String(item)
              : Array.isArray(item)
                ? item.map(String).join(", ")
                : "Structured result available"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const identity = await requireAdmin();
  const { assessmentId } = await params;
  const admin = createAdminSupabaseClient();
  const [
    { data: assessment },
    { data: progressData },
    { data: resultsData },
  ] = await Promise.all([
    admin
      .from("lmu_assessments")
      .select(
        "id,status,current_module,started_at,completed_at,updated_at,participants!inner(first_name,email)",
      )
      .eq("id", assessmentId)
      .maybeSingle(),
    admin
      .from("lmu_section_progress")
      .select("section_key,status,current_step,updated_at")
      .eq("assessment_id", assessmentId),
    admin
      .from("lmu_results")
      .select("section_key,result_data,finalized_at")
      .eq("assessment_id", assessmentId),
  ]);
  const progress = progressData ?? [];
  const results = resultsData ?? [];
  if (!assessment) notFound();
  await audit(
    identity,
    "viewed_assessment_detail",
    "lmu_assessment",
    assessmentId,
  );
  const person = Array.isArray(assessment.participants)
    ? assessment.participants[0]
    : assessment.participants;
  return (
    <AdminShell admin={identity}>
      <p className="admin-kicker admin-lmu-kicker">
        Life Mapping U / Assessment
      </p>
      <h1>{person?.first_name}</h1>
      <div className="admin-detail-meta">
        <div>
          <span>Email</span>
          <strong>{person?.email}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{humanize(assessment.status)}</strong>
        </div>
        <div>
          <span>Current module</span>
          <strong>{humanize(assessment.current_module)}</strong>
        </div>
        <div>
          <span>Started</span>
          <strong>{formatDate(assessment.started_at)}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{formatDate(assessment.completed_at)}</strong>
        </div>
      </div>
      <section className="admin-sections">
        <h2>Section progress</h2>
        {sections.map((section) => {
          const state = progress.find((x) => x.section_key === section);
          const result = results.find((x) => x.section_key === section);
          return (
            <details key={section}>
              <summary>
                <strong>{humanize(section)}</strong>
                <span>{humanize(state?.status ?? "not_started")}</span>
              </summary>
              {result ? (
                <ResultView value={result.result_data} />
              ) : (
                <p>No finalized result yet.</p>
              )}
            </details>
          );
        })}
      </section>
    </AdminShell>
  );
}
