import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import type { ModuleProgressStatus } from "@/lib/experiences/lmu/types";
import { SUCCESS_STORIES_MAXIMUM, SUCCESS_STORIES_MINIMUM } from "./config";
import type { SuccessStoriesResponse, SuccessStoriesScreen, SuccessStory, SuccessStoryComparison, SuccessStoryDraft, TopThreeSelection } from "./types";

const MODULE_ID = "success-stories";

const TEST_STORY_TITLE_UPDATES: Record<string, string> = {
  "Story 2": "Built a Soccer Goal",
  "Story 5": "Danced in the Nutcracker",
  "Story 1": "Made National Honor Society",
};

interface LegacySuccessStory extends Partial<SuccessStory> {
  role?: string;
  actions?: string;
  passion?: string;
  strength?: string;
}

function normalizeStory(story: LegacySuccessStory): SuccessStory {
  const reflection = story.reflection?.trim() || [story.passion, story.strength]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .join("\n\n");
  const now = new Date().toISOString();

  return {
    id: story.id ?? crypto.randomUUID(),
    title: story.title ?? "",
    ageRange: story.ageRange || undefined,
    story: story.story ?? "",
    reflection,
    createdAt: story.createdAt ?? now,
    updatedAt: story.updatedAt ?? story.createdAt ?? now,
  };
}

function normalizeDraft(draft?: LegacySuccessStory): SuccessStoryDraft | undefined {
  if (!draft) return undefined;
  const story = normalizeStory(draft);
  return { id: story.id, title: story.title, ageRange: story.ageRange, story: story.story, reflection: story.reflection, createdAt: story.createdAt };
}

export function readSuccessStoriesResponse(): SuccessStoriesResponse {
  const moduleProgress = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const response = moduleProgress?.responses as Partial<SuccessStoriesResponse> | undefined;
  const storedStories = Array.isArray(response?.stories) ? response.stories : [];
  const titledStories = storedStories.map((story) => {
    const title = TEST_STORY_TITLE_UPDATES[story.title];
    return title ? { ...story, title } : story;
  });
  if (moduleProgress && titledStories.some((story, index) => story !== storedStories[index])) {
    saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, {
      ...moduleProgress,
      responses: { ...response, stories: titledStories } as Record<string, unknown>,
    });
  }
  const stories = titledStories.map((story) => normalizeStory(story as LegacySuccessStory));
  const storyIds = new Set(stories.map((story) => story.id));
  const selection = response?.topThreeSelection as Partial<TopThreeSelection> | undefined;
  const comparisons = Array.isArray(selection?.comparisons)
    ? selection.comparisons.filter((comparison) => storyIds.has(comparison.leftStoryId) && storyIds.has(comparison.rightStoryId))
    : [];
  const proposedStoryIds = Array.isArray(selection?.proposedStoryIds) ? selection.proposedStoryIds.filter((id) => storyIds.has(id)) : [];
  const finalStoryIds = Array.isArray(selection?.finalStoryIds) ? selection.finalStoryIds.filter((id) => storyIds.has(id)) : [];
  const topThreeSelection = selection ? {
    comparisons,
    proposedStoryIds,
    finalStoryIds: finalStoryIds.length === 3 ? finalStoryIds : [],
    finalizedAt: finalStoryIds.length === 3 ? selection.finalizedAt : undefined,
  } : undefined;
  return {
    stories,
    draft: normalizeDraft(response?.draft as LegacySuccessStory | undefined),
    topThreeSelection,
    resumeScreen: response?.resumeScreen,
  };
}

function saveResponse(response: SuccessStoriesResponse, requestedStatus?: ModuleProgressStatus) {
  const existing = getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, MODULE_ID);
  const validStories = response.stories.filter((story) => story.title.trim() && story.story.trim());
  const hasMinimum = validStories.length >= SUCCESS_STORIES_MINIMUM;
  const validIds = new Set(validStories.map((story) => story.id));
  const finalIds = response.topThreeSelection?.finalStoryIds ?? [];
  const hasFinalTopThree = Boolean(response.topThreeSelection?.finalizedAt)
    && finalIds.length === 3
    && new Set(finalIds).size === 3
    && finalIds.every((id) => validIds.has(id));
  const canComplete = hasMinimum && hasFinalTopThree;
  const status = requestedStatus === "completed" && canComplete
    ? "completed"
    : existing?.status === "completed" && canComplete
      ? "completed"
      : "available";

  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID, {
    moduleId: MODULE_ID,
    status,
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    completedAt: status === "completed" ? existing?.completedAt ?? new Date().toISOString() : undefined,
    responses: response as unknown as Record<string, unknown>,
    derivedResults: existing?.derivedResults ?? {},
    result: existing?.result,
  });
}

export function saveSuccessStoryDraft(draft?: SuccessStoryDraft) {
  const response = readSuccessStoriesResponse();
  saveResponse({ ...response, draft });
}

export function saveSuccessStoriesLocation(resumeScreen: SuccessStoriesScreen) {
  const response = readSuccessStoriesResponse();
  saveResponse({ ...response, resumeScreen });
}

export function saveSuccessStory(story: SuccessStory) {
  const response = readSuccessStoriesResponse();
  const exists = response.stories.some((item) => item.id === story.id);
  if (!exists && response.stories.length >= SUCCESS_STORIES_MAXIMUM) return;
  const stories = exists
    ? response.stories.map((item) => item.id === story.id ? story : item)
    : [...response.stories, story];
  saveResponse({ ...response, stories, draft: undefined });
}

export function deleteSuccessStory(storyId: string) {
  const response = readSuccessStoriesResponse();
  const selection = response.topThreeSelection;
  const deletedFinalStory = selection?.finalStoryIds.includes(storyId);
  saveResponse({
    stories: response.stories.filter((story) => story.id !== storyId),
    topThreeSelection: selection ? {
      comparisons: selection.comparisons.filter((comparison) => comparison.leftStoryId !== storyId && comparison.rightStoryId !== storyId),
      proposedStoryIds: selection.proposedStoryIds.filter((id) => id !== storyId),
      finalStoryIds: deletedFinalStory ? [] : selection.finalStoryIds,
      finalizedAt: deletedFinalStory ? undefined : selection.finalizedAt,
    } : undefined,
  });
}

export function saveSuccessStoryComparison(comparison: SuccessStoryComparison) {
  const response = readSuccessStoriesResponse();
  const selection = response.topThreeSelection ?? { comparisons: [], proposedStoryIds: [], finalStoryIds: [] };
  saveResponse({ ...response, topThreeSelection: { ...selection, comparisons: [...selection.comparisons, comparison] } });
}

export function removeLastSuccessStoryComparison() {
  const response = readSuccessStoriesResponse();
  const selection = response.topThreeSelection;
  if (!selection?.comparisons.length) return;
  saveResponse({ ...response, topThreeSelection: { ...selection, comparisons: selection.comparisons.slice(0, -1), proposedStoryIds: [] } });
}

export function saveTopThreeProposal(proposedStoryIds: string[], invalidateFinal = true) {
  const response = readSuccessStoriesResponse();
  const selection = response.topThreeSelection ?? { comparisons: [], proposedStoryIds: [], finalStoryIds: [] };
  saveResponse({ ...response, topThreeSelection: {
    ...selection,
    proposedStoryIds,
    finalStoryIds: invalidateFinal ? [] : selection.finalStoryIds,
    finalizedAt: invalidateFinal ? undefined : selection.finalizedAt,
  } });
}

export function finalizeTopThree(finalStoryIds: string[]) {
  if (finalStoryIds.length !== 3 || new Set(finalStoryIds).size !== 3) return false;
  const response = readSuccessStoriesResponse();
  const validIds = new Set(response.stories.filter((story) => story.title.trim() && story.story.trim()).map((story) => story.id));
  if (!finalStoryIds.every((id) => validIds.has(id))) return false;
  const selection = response.topThreeSelection ?? { comparisons: [], proposedStoryIds: [], finalStoryIds: [] };
  saveResponse({ ...response, topThreeSelection: { ...selection, proposedStoryIds: finalStoryIds, finalStoryIds, finalizedAt: new Date().toISOString() } });
  return true;
}

export function restartTopThreeSelection() {
  const response = readSuccessStoriesResponse();
  saveResponse({ ...response, topThreeSelection: undefined });
}

export function getFinalizedTopThreeStories() {
  const response = readSuccessStoriesResponse();
  if (!response.topThreeSelection?.finalizedAt || response.topThreeSelection.finalStoryIds.length !== 3) return [];
  const storiesById = new Map(response.stories.map((story) => [story.id, story]));
  return response.topThreeSelection.finalStoryIds.flatMap((id) => {
    const story = storiesById.get(id);
    return story ? [story] : [];
  });
}

export function completeSuccessStories() {
  saveResponse(readSuccessStoriesResponse(), "completed");
}

export function reconcileSuccessStoriesCompletion() {
  saveResponse(readSuccessStoriesResponse());
}
