import type { Json, Tables } from "@/lib/supabase/database.types";

export const COMPANION_TYPES = ["personal_notes", "resources", "action_steps", "reflection_prompt", "facilitator", "next_gathering", "custom_text", "custom_link", "chat", "video_call", "group_members", "prayer", "announcements", "shared_resources", "group_discussion_prompt", "group_notes"] as const;
export type CompanionModuleType = typeof COMPANION_TYPES[number];
export type CompanionScope = "course" | "module" | "lesson" | "page";
export type CompanionAudience = "personal" | "group" | "leaders";
export const COMPANION_AVAILABILITIES = ["individual", "cohort", "both"] as const;
export type CompanionAvailability = typeof COMPANION_AVAILABILITIES[number];
export type CompanionModuleRecord = Tables<"companion_modules">;

export type CompanionCreatorGroup = "personal_cohort" | "cohort_only";
export type CompanionDefinition = Readonly<{ label: string; description: string; defaultScope: CompanionScope; defaultAudience: CompanionAudience; audiences: readonly CompanionAudience[]; defaultAvailability: CompanionAvailability; availabilities: readonly CompanionAvailability[]; creatorGroup: CompanionCreatorGroup; creatorLabel?: string; singleInstance?: boolean; future?: boolean }>;
export const COMPANION_LIBRARY: Record<CompanionModuleType, CompanionDefinition> = {
  personal_notes: { label: "Personal Notes", description: "Private personal notes for each learner.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal"], defaultAvailability: "individual", availabilities: ["individual"], creatorGroup: "personal_cohort", singleInstance: true },
  resources: { label: "Resources", description: "Files and links available alongside the Course.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal", "group", "leaders"], defaultAvailability: "both", availabilities: ["individual", "cohort", "both"], creatorGroup: "personal_cohort" },
  action_steps: { label: "Action Steps", description: "Practical next steps and checklist prompts.", defaultScope: "module", defaultAudience: "personal", audiences: ["personal"], defaultAvailability: "individual", availabilities: ["individual", "both"], creatorGroup: "personal_cohort" },
  reflection_prompt: { label: "Reflection / Prompt", description: "A contextual reflection question.", defaultScope: "module", defaultAudience: "personal", audiences: ["personal", "group"], defaultAvailability: "individual", availabilities: ["individual", "both"], creatorGroup: "personal_cohort", creatorLabel: "Reflection Prompt" },
  facilitator: { label: "Facilitator / Guide", description: "Introduce the person guiding this experience.", defaultScope: "course", defaultAudience: "group", audiences: ["personal", "group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only", creatorLabel: "Facilitator" },
  next_gathering: { label: "Next Gathering", description: "Upcoming date, time, location, and action.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only" },
  custom_text: { label: "Custom Text", description: "Short, safe formatted Companion copy.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal", "group", "leaders"], defaultAvailability: "both", availabilities: ["individual", "cohort", "both"], creatorGroup: "personal_cohort" },
  custom_link: { label: "Custom Link / Action", description: "A clear contextual call to action.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal", "group", "leaders"], defaultAvailability: "both", availabilities: ["individual", "cohort", "both"], creatorGroup: "personal_cohort", creatorLabel: "Custom Link" },
  chat: { label: "Chat", description: "Persistent conversation for the Cohort.", defaultScope: "course", defaultAudience: "group", audiences: ["group"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only", singleInstance: true },
  video_call: { label: "Video Conference", description: "Cohort-specific meeting access.", defaultScope: "course", defaultAudience: "group", audiences: ["group"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only", singleInstance: true },
  group_members: { label: "Cohort Members", description: "People in the learner’s selected Cohort.", defaultScope: "course", defaultAudience: "group", audiences: ["group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only", singleInstance: true },
  prayer: { label: "Prayer", description: "A future-ready Cohort prayer space.", defaultScope: "course", defaultAudience: "group", audiences: ["group"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only", future: true },
  announcements: { label: "Announcements", description: "Important Course or Cohort updates.", defaultScope: "course", defaultAudience: "group", audiences: ["group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort", "both"], creatorGroup: "cohort_only" },
  shared_resources: { label: "Shared Resources", description: "Resources shared with this Cohort.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only" },
  group_discussion_prompt: { label: "Cohort Discussion Prompt", description: "A prompt to carry into Cohort discussion.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only" },
  group_notes: { label: "Cohort Notes / Takeaways", description: "Configured Cohort takeaways; collaborative editing comes later.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"], defaultAvailability: "cohort", availabilities: ["cohort"], creatorGroup: "cohort_only", creatorLabel: "Cohort Notes" },
};

export const COMPANION_CREATOR_GROUPS = [
  { id: "personal_cohort", label: "Personal + Cohort", description: "Personal learner tools that remain available in a Cohort." },
  { id: "cohort_only", label: "Cohort Only", description: "Tools that require a valid Cohort context." },
] as const;

export function companionCreatorGroups(existingTypes: readonly string[] = []) {
  const added = new Set(existingTypes);
  return COMPANION_CREATOR_GROUPS.map((group) => ({
    ...group,
    items: COMPANION_TYPES.filter((type) => COMPANION_LIBRARY[type].creatorGroup === group.id).map((type) => ({
      type,
      definition: COMPANION_LIBRARY[type],
      added: added.has(type),
      disabled: added.has(type) && Boolean(COMPANION_LIBRARY[type].singleInstance),
    })),
  }));
}

export function companionType(value: unknown): CompanionModuleType | null { return COMPANION_TYPES.includes(value as CompanionModuleType) ? value as CompanionModuleType : null; }
export function companionAvailability(value: unknown): CompanionAvailability | null { return COMPANION_AVAILABILITIES.includes(value as CompanionAvailability) ? value as CompanionAvailability : null; }
export function availabilityApplies(availability: CompanionAvailability, hasCohortContext: boolean) { return availability !== "cohort" || hasCohortContext; }
export function audienceAllowsParticipant(audience: string, currentMemberRole: string | null) { return audience !== "leaders" || currentMemberRole === "facilitator"; }
export function companionModuleAvailable(module: Pick<CompanionModuleRecord, "availability_context" | "audience">, hasCohortContext: boolean, currentMemberRole: string | null, bypassAudience = false) {
  return availabilityApplies(module.availability_context, hasCohortContext)
    && (bypassAudience || audienceAllowsParticipant(module.audience, currentMemberRole));
}
export function companionObject(value: unknown): Record<string, Json | undefined> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {}; }
export function companionText(config: unknown, key: string) { const value = companionObject(config)[key]; return typeof value === "string" ? value : ""; }
export function companionLines(config: unknown, key = "items") { const value = companionObject(config)[key]; return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []; }

export function moduleApplies(module: CompanionModuleRecord, current: { moduleId: string; lessonId: string; sectionId: string }) {
  return module.scope === "course"
    || module.scope === "module" && module.target_module_id === current.moduleId
    || module.scope === "lesson" && module.target_lesson_id === current.lessonId
    || module.scope === "page" && module.target_section_id === current.sectionId;
}
