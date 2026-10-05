export type JourneyRecord = {
  id: string;
  kind: "course" | "assessment";
  title: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  cohort: string | null;
  versionId: string | null;
  enrollmentId: string | null;
  historical: boolean;
};
export type WayfinderJourneyData = { records: JourneyRecord[] };
