import type { SuccessStory } from "@/modules/lmu/success-stories/types";
import type { RankingItemVisual } from "./ranking-visuals";

export function successStoryToRankingVisual(story: SuccessStory): RankingItemVisual {
  return {
    id: story.id,
    title: story.title,
    iconKey: "story",
    metadata: story.ageRange ? `Ages ${story.ageRange}` : undefined,
    detailLabel: "What happened?",
    detailContent: story.story,
  };
}
