export interface SuccessStory {
  id: string;
  title: string;
  ageRange?: string;
  story: string;
  reflection: string;
  createdAt: string;
  updatedAt: string;
}

export type SuccessStoryDraft = Omit<SuccessStory, "createdAt" | "updatedAt"> & {
  createdAt?: string;
};

export interface SuccessStoryComparison {
  leftStoryId: string;
  rightStoryId: string;
  selectedStoryId: string;
  createdAt: string;
}

export interface TopThreeSelection {
  comparisons: SuccessStoryComparison[];
  proposedStoryIds: string[];
  finalStoryIds: string[];
  finalizedAt?: string;
}

export interface SuccessStoriesResponse {
  stories: SuccessStory[];
  draft?: SuccessStoryDraft;
  topThreeSelection?: TopThreeSelection;
  resumeScreen?: SuccessStoriesScreen;
}

export type SuccessStoriesScreen = "introduction" | "collection" | "editor" | "top-three-intro" | "comparison" | "top-three-review";
