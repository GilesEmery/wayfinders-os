import { notFound } from "next/navigation";
import { ParticipantCourseRuntime } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { getAdminCoursePreview } from "@/lib/experiences/admin/preview";
import { PreviewDeviceFrame } from "@/components/admin/PreviewDeviceFrame";

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ experienceId: string; versionId: string; moduleKey: string; lessonKey: string; sectionKey: string }>; searchParams: Promise<{ cohort?: string | string[] }> }) {
  const [route, query] = await Promise.all([params, searchParams]);
  const cohortId = typeof query.cohort === "string" && query.cohort ? query.cohort : null;
  let preview;
  try { preview = await getAdminCoursePreview(route.experienceId, route.versionId, cohortId); } catch { notFound(); }
  const current = flattenCourseSections(preview.structure).find((item) => item.moduleKey === route.moduleKey && item.lessonKey === route.lessonKey && item.section.section_key === route.sectionKey);
  if (!current) notFound();
  return <PreviewDeviceFrame contexts={preview.previewContexts} selectedContext={cohortId ?? ""}><ParticipantCourseRuntime {...preview} current={current} cohortId={cohortId} preview={{ experienceId: route.experienceId, versionId: route.versionId, cohortId }}/></PreviewDeviceFrame>;
}
