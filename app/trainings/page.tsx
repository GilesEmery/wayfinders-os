import type { Metadata } from "next";
import { ParticipantCourseCard } from "@/components/platform/ParticipantCourseCard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getTrainingCatalog } from "@/lib/platform/training-catalog";
import { TRAINING_CATALOG_EMPTY_MESSAGE, trainingCatalogAccessLabel, trainingCatalogActionLabel } from "@/lib/platform/training-catalog-policy";

export const metadata: Metadata = { title: "Trainings" };

export default async function TrainingsPage() {
  const { items, signedIn } = await getTrainingCatalog();
  return <PlatformShell><section className="platform-index training-catalog"><header><p className="platform-eyebrow">PurposeOS Trainings</p><h1>Training for the journey ahead.</h1><p>Browse available trainings. Your active and completed enrollments are available in My Journey.</p></header>{items.length ? <div className="participant-course-card-list">{items.map((item) => <ParticipantCourseCard key={item.id} card={item.card} href={item.href} actionLabel={trainingCatalogActionLabel(signedIn, item.enrollmentStatus, item.admissionPolicy)} meta={(item.passwordProtected ? "Password protected · " : "") + trainingCatalogAccessLabel(signedIn, item.enrollmentStatus, item.admissionPolicy)}/>)}</div> : <p className="training-catalog-empty">{TRAINING_CATALOG_EMPTY_MESSAGE}</p>}</section></PlatformShell>;
}
