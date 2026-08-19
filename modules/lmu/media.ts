import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";

const BUNNY_LIBRARY_ID = "732162";
const BUNNY_CDN_HOST = "vz-1f325b18-309.b-cdn.net";

function bunnyVideo(
  videoId: string,
  posterTitle: string,
  posterBadge: NonNullable<LMUInstructionalMedia["posterBadge"]>,
  title: string,
  description?: string,
): LMUInstructionalMedia {
  return {
    provider: "bunny",
    libraryId: BUNNY_LIBRARY_ID,
    videoId,
    hlsUrl: `https://${BUNNY_CDN_HOST}/${videoId}/playlist.m3u8`,
    posterTitle,
    posterBadge,
    title,
    description,
  };
}

export const lmuInstructionalMedia = {
  successStories: bunnyVideo("cbc10e13-e370-44c2-8da6-c399c646d475", "Success Stories", "story", "Success Stories instructional video"),
  topThreeSuccessStories: bunnyVideo("72c6004c-56a6-4e48-90d4-59714869665e", "Top 3 Success Stories", "story", "Identify Your Top 3 instructional video"),
  transferableSkills: bunnyVideo("70b505f2-66a6-42e4-a68c-93b82e05c627", "Transferable Skills", "realistic", "Transferable Skills instructional video", "Use your Success Stories to notice the skills you repeatedly bring with you."),
  teammates: bunnyVideo("7db508d1-0436-4f61-a62f-12edd3ed8370", "Teammates", "teammates", "Teammates instructional video", "Identify the teammate qualities and work culture that help you do your best work."),
  supervisor: bunnyVideo("f95044bb-2160-4cbd-8ff2-1e2b6625a550", "Supervisor", "supervisor", "Supervisor instructional video", "Clarify the leadership qualities and behaviors that help you do your best work."),
  values: bunnyVideo("fc9e05f7-93c3-4305-ae06-50367c46f63e", "Values", "values", "Values instructional video", "Name the values that orient meaningful work and life."),
  growth: bunnyVideo("feab325e-c0de-4590-917f-13d71ce94eb2", "Growth", "growth", "Growth instructional video", "Identify where you are ready to learn, develop, and stretch."),
  location: bunnyVideo("1e90e663-0a50-4cea-bf55-1c993f79e7c1", "Location", "location", "Location instructional video", "Reflect on where you would most like—or realistically be willing—to live."),
  xFactor: bunnyVideo("84fdbc9c-9b36-480d-aeba-97ccd8a1266f", "X-Factor", "x-factor", "X-Factors instructional video", "Identify the personal traits, priorities, interests, and preferences that bring alignment to your future decisions."),
  salary: bunnyVideo("ec9c0a0d-e3cc-4b0c-89c7-2f77b3802e6f", "Salary", "salary", "Salary instructional video", "Reflect practically on the financial realities, responsibilities, and goals that shape informed decisions."),
} satisfies Record<string, LMUInstructionalMedia>;
