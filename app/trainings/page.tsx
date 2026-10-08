import type { Metadata } from "next";
import { ParticipantCourseCard } from "@/components/platform/ParticipantCourseCard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getTrainingCatalog } from "@/lib/platform/training-catalog";
import { TRAINING_CATALOG_EMPTY_MESSAGE, trainingCatalogAccessLabel, trainingCatalogActionLabel } from "@/lib/platform/training-catalog-policy";

export const metadata: Metadata = { title: "Trainings and Assessments" };

export default async function TrainingsPage() {
  const { items, signedIn } = await getTrainingCatalog();
  return <PlatformShell><section className="platform-index training-catalog"><header><p className="platform-eyebrow">PurposeOS Trainings and Assessments</p><h1>Trainings and Assessments</h1><p>Browse available trainings and assessments. Your active and completed enrollments are available in My Journey.</p></header>{[false, true].map(isAssessment => {
    const groupedItems = items.filter(item => (item.experienceType === "assessment") === isAssessment);
    return <section className="experience-category" key={String(isAssessment)}><h2>{isAssessment ? "Assessments" : "Trainings"}</h2>{groupedItems.length ? <div className="participant-course-card-list">{groupedItems.map(item => <ParticipantCourseCard key={item.id} card={item.card} href={item.completedResultHref ?? item.href} actionLabel={item.completedResultHref || item.enrollmentStatus === "completed" && isAssessment ? "View results" : item.enrollmentStatus === "completed" ? "Start over" : trainingCatalogActionLabel(signedIn, item.enrollmentStatus, item.admissionPolicy)} secondaryAction={isAssessment && (item.completedResultHref || item.enrollmentStatus === "completed") ? { href: item.href, label: "Revisit / Redo" } : undefined} meta={(item.passwordProtected ? "Password protected · " : "") + trainingCatalogAccessLabel(signedIn, item.enrollmentStatus, item.admissionPolicy)}/>)}</div> : <p className="training-catalog-empty">{isAssessment ? "No assessments are available yet." : TRAINING_CATALOG_EMPTY_MESSAGE}</p>}</section>;
  })}</section></PlatformShell>;
}
