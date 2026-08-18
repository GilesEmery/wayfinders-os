export const lmuIconFamilies = ["set-a", "set-b", "set-c", "set-d"] as const;
export const lmuIconNames = ["story", "realistic", "social", "conventional", "artistic", "enterprising", "investigative", "teammates", "supervisor", "values", "growth", "location", "x-factor", "salary", "motivators"] as const;
export type LMUIconFamily = (typeof lmuIconFamilies)[number];
export type LMUIconName = (typeof lmuIconNames)[number];

export interface LMUFamilyIconProps {
  name: LMUIconName;
  title?: string;
}
