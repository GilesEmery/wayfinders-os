import { notFound } from "next/navigation";
import { ParticipantCourseRuntime } from "@/components/experiences/builder/ParticipantCourseRuntime";
import { flattenCourseSections } from "@/components/experiences/builder/CourseNavigator";
import { getAdminCoursePreview } from "@/lib/experiences/admin/preview";

export default async function PreviewPage({ params }: { params: Promise<{ experienceId: string; versionId: string; moduleKey: string; lessonKey: string; sectionKey: string }> }) {
  const route = await params;
  let preview;
  try { preview = await getAdminCoursePreview(route.experienceId, route.versionId); } catch { notFound(); }
  const current = flattenCourseSections(preview.structure).find((item) => item.moduleKey === route.moduleKey && item.lessonKey === route.lessonKey && item.section.section_key === route.sectionKey);
  if (!current) notFound();
  return <ParticipantCourseRuntime {...preview} current={current} preview={{ experienceId: route.experienceId, versionId: route.versionId }}/>;
}
