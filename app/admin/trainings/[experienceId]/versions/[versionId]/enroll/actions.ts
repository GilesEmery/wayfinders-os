"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enrollParticipantInVersion } from "@/lib/experiences/admin/enrollment-mutations";

const message = (error: unknown) => encodeURIComponent(error instanceof Error ? error.message : "Enrollment could not be completed.");

export async function enrollAction(experienceId: string, versionId: string, form: FormData) {
  const participantId = String(form.get("participant_id") ?? "");
  try {
    const result = await enrollParticipantInVersion(experienceId, versionId, participantId);
    revalidatePath(`/admin/trainings/${experienceId}/versions/${versionId}/enroll`);
    redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?${result.reused ? "reused" : "enrolled"}=1`);
  } catch (error) {
    redirect(`/admin/trainings/${experienceId}/versions/${versionId}/enroll?error=${message(error)}`);
  }
}
