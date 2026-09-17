import type { Json, Tables } from "@/lib/supabase/database.types";

export const COMPANION_TYPES = ["personal_notes", "resources", "action_steps", "reflection_prompt", "facilitator", "next_gathering", "custom_text", "custom_link", "chat", "video_call", "group_members", "prayer", "announcements", "shared_resources", "group_discussion_prompt", "group_notes"] as const;
export type CompanionModuleType = typeof COMPANION_TYPES[number];
export type CompanionScope = "course" | "module" | "lesson" | "page";
export type CompanionAudience = "personal" | "group" | "leaders";
export type CompanionModuleRecord = Tables<"companion_modules">;

export type CompanionDefinition = Readonly<{ label: string; description: string; defaultScope: CompanionScope; defaultAudience: CompanionAudience; audiences: readonly CompanionAudience[]; future?: boolean }>;
export const COMPANION_LIBRARY: Record<CompanionModuleType, CompanionDefinition> = {
  personal_notes: { label: "Personal Notes", description: "A private notebook for this participant.", defaultScope: "module", defaultAudience: "personal", audiences: ["personal"] },
  resources: { label: "Resources", description: "Course files and links from the Resource library.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal", "group", "leaders"] },
  action_steps: { label: "Action Steps", description: "Practical next steps and checklist prompts.", defaultScope: "module", defaultAudience: "personal", audiences: ["personal"] },
  reflection_prompt: { label: "Reflection / Prompt", description: "A contextual reflection question.", defaultScope: "module", defaultAudience: "personal", audiences: ["personal", "group"] },
  facilitator: { label: "Facilitator / Guide", description: "Introduce the person guiding this experience.", defaultScope: "course", defaultAudience: "group", audiences: ["personal", "group", "leaders"] },
  next_gathering: { label: "Next Gathering", description: "Upcoming date, time, location, and action.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"] },
  custom_text: { label: "Custom Text", description: "Short, safe formatted Companion copy.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal", "group", "leaders"] },
  custom_link: { label: "Custom Link / Action", description: "A clear contextual call to action.", defaultScope: "course", defaultAudience: "personal", audiences: ["personal", "group", "leaders"] },
  chat: { label: "Chat", description: "A delivery-isolated group conversation space.", defaultScope: "course", defaultAudience: "group", audiences: ["group"] },
  video_call: { label: "Video Call", description: "A meeting link and recurring call details.", defaultScope: "course", defaultAudience: "group", audiences: ["group", "leaders"] },
  group_members: { label: "Group Members", description: "People in this participant’s delivery group.", defaultScope: "course", defaultAudience: "group", audiences: ["group", "leaders"] },
  prayer: { label: "Prayer", description: "A future-ready group prayer space.", defaultScope: "course", defaultAudience: "group", audiences: ["group"], future: true },
  announcements: { label: "Announcements", description: "Important delivery-specific updates.", defaultScope: "course", defaultAudience: "group", audiences: ["group", "leaders"] },
  shared_resources: { label: "Shared Resources", description: "Resources shared with this group.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"] },
  group_discussion_prompt: { label: "Group Discussion Prompt", description: "A prompt to carry into group discussion.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"] },
  group_notes: { label: "Group Notes / Takeaways", description: "Configured group takeaways; collaborative editing comes later.", defaultScope: "module", defaultAudience: "group", audiences: ["group", "leaders"] },
};

export function companionType(value: unknown): CompanionModuleType | null { return COMPANION_TYPES.includes(value as CompanionModuleType) ? value as CompanionModuleType : null; }
export function companionObject(value: unknown): Record<string, Json | undefined> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {}; }
export function companionText(config: unknown, key: string) { const value = companionObject(config)[key]; return typeof value === "string" ? value : ""; }
export function companionLines(config: unknown, key = "items") { const value = companionObject(config)[key]; return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []; }

export function moduleApplies(module: CompanionModuleRecord, current: { moduleId: string; lessonId: string; sectionId: string }) {
  return module.scope === "course"
    || module.scope === "module" && module.target_module_id === current.moduleId
    || module.scope === "lesson" && module.target_lesson_id === current.lessonId
    || module.scope === "page" && module.target_section_id === current.sectionId;
}
