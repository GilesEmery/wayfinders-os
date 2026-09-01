import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";

function youtubeVideo(
  videoId: string,
  posterTitle: string,
  posterBadge: NonNullable<LMUInstructionalMedia["posterBadge"]>,
  title: string,
  description?: string,
): LMUInstructionalMedia {
  return {
    provider: "youtube",
    videoId,
    posterTitle,
    posterBadge,
    title,
    description,
  };
}

export const lmuInstructionalMedia = {
  successStories: youtubeVideo("tVzB7vTTxUw", "Success Stories", "story", "Success Stories instructional video"),
  topThreeSuccessStories: youtubeVideo("3-v0fl2ARkQ", "Top 3 Success Stories", "story", "Identify Your Top 3 instructional video"),
  transferableSkills: youtubeVideo("sqKzN0zT49c", "Transferable Skills", "realistic", "Transferable Skills instructional video", "Use your Success Stories to notice the skills you repeatedly bring with you."),
  teammates: youtubeVideo("3paNnT-fziA", "Teammates", "teammates", "Teammates instructional video", "Identify the teammate qualities and work culture that help you do your best work."),
  supervisor: youtubeVideo("in1P40RteEE", "Supervisor", "supervisor", "Supervisor instructional video", "Clarify the leadership qualities and behaviors that help you do your best work."),
  values: youtubeVideo("mrboqGG_8u0", "Values", "values", "Values instructional video", "Name the values that orient meaningful work and life."),
  growth: youtubeVideo("J0IMdVwiohc", "Growth", "growth", "Growth instructional video", "Identify where you are ready to learn, develop, and stretch."),
  location: youtubeVideo("6-jiZeff5qc", "Location", "location", "Location instructional video", "Reflect on where you would most like—or realistically be willing—to live."),
  xFactor: youtubeVideo("2q5ytFcEA1I", "X-Factor", "x-factor", "X-Factors instructional video", "Identify the personal traits, priorities, interests, and preferences that bring alignment to your future decisions."),
  salary: youtubeVideo("fBnnMap4CWY", "Salary", "salary", "Salary instructional video", "Reflect practically on the financial realities, responsibilities, and goals that shape informed decisions."),
} satisfies Record<string, LMUInstructionalMedia>;
