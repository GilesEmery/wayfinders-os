"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { enrollParticipantInVersion, withdrawParticipantEnrollment } from "@/lib/experiences/admin/enrollment-mutations";

const message = (error: unknown) => encodeURIComponent(error instanceof Error ? error.message : "Enrollment could not be completed.");

export async function enrollAction(experienceId: string, versionId: string, form: FormData) {
  const participantId = String(form.get("participant_id") ?? "");
  try {
    const result = await enrollParticipantInVersion(experienceId, versionId, participantId);
    revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}/enroll`);
    redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?${result.reused ? "reused" : "enrolled"}=1`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?error=${message(error)}`);
  }
}

export async function removeEnrollmentAction(experienceId: string, versionId: string, enrollmentId: string, form: FormData) {
  if (form.get("confirm_remove") !== "yes") redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?error=${encodeURIComponent("Confirm learner removal before continuing.")}`);
  try {
    await withdrawParticipantEnrollment(experienceId, versionId, enrollmentId);
    revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}/enroll`);
    revalidatePath("/dashboard");
    revalidatePath("/experiences");
    redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?removed=1`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?error=${message(error)}`);
  }
}
