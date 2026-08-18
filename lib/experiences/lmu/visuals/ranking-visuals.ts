export const rankingIconKeys = [
  "story", "realistic", "social", "conventional", "artistic", "enterprising", "investigative", "food", "running", "sports", "fitness", "music", "singing",
  "theater", "art", "design", "writing", "reading", "education", "teaching",
  "leadership", "business", "entrepreneurship", "sales", "technology", "coding",
  "building", "repair", "making", "outdoors", "nature", "travel", "community",
  "volunteering", "service", "health", "family", "relationships", "faith",
  "speaking", "event", "planning", "problem-solving", "research", "finance",
  "photography", "gardening", "animals",
] as const;

export type RankingIconKey = (typeof rankingIconKeys)[number];

export interface RankingItemVisual {
  id: string;
  title: string;
  iconKey: RankingIconKey;
  metadata?: string;
  detailLabel?: string;
  detailContent?: ReactNode;
}
import type { ReactNode } from "react";
