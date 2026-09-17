/* eslint-disable @next/next/no-img-element -- course assets can use signed or approved external hosts */
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getTrainingCatalog } from "@/lib/platform/training-catalog";

export const metadata: Metadata = { title: "Trainings" };

function actionLabel(signedIn: boolean, enrollmentStatus: string | null, admissionPolicy: string) {
  if (!signedIn) return "View Training";
  if (enrollmentStatus === "in_progress") return "Continue Training";
  if (enrollmentStatus) return "Open Training";
  return admissionPolicy === "open_enrollment" ? "View / Enroll" : "View Details";
}

export default async function TrainingsPage() {
  const { items, signedIn } = await getTrainingCatalog();
  return <PlatformShell><section className="platform-index training-catalog"><header><p className="platform-eyebrow">PurposeOS Trainings</p><h1>Training for the journey ahead.</h1><p>Browse available trainings. Your active and completed enrollments remain in My Trainings on your Dashboard.</p></header>{items.length ? <div className="platform-card-grid">{items.map((item) => <article className="platform-experience-card training-catalog-card" key={item.id}>{item.coverUrl && <div className="training-catalog-cover"><img alt="" loading="lazy" src={item.coverUrl}/></div>}<p className="platform-card-type">{item.experienceType.replaceAll("_", " ")}</p><h2>{item.name}</h2>{item.description && <p>{item.description}</p>}<p className="training-catalog-access">{item.enrollmentStatus ? "Already in My Trainings" : item.admissionPolicy === "open_enrollment" ? signedIn ? "Open Enrollment" : "Sign in to enroll" : "Enrollment is assigned by Wayfinders staff"}</p><Link href={item.href}>{actionLabel(signedIn, item.enrollmentStatus, item.admissionPolicy)} <span aria-hidden="true">→</span></Link></article>)}</div> : <p className="training-catalog-empty">No trainings are currently available to browse.</p>}</section></PlatformShell>;
}
