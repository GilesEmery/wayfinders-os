import type { LMUIconName } from "@/components/experiences/lmu/icons/types";
import type { MotivatorId } from "./types";
export interface MotivatorDefinition { id: MotivatorId; label: string; sourceModuleId: string; badgeKey: LMUIconName; supportingDescription: string }
export const motivatorDefinitions: MotivatorDefinition[] = [
  { id:"skills", label:"Skills", sourceModuleId:"transferable-skills", badgeKey:"realistic", supportingDescription:"The abilities you consistently bring with you." },
  { id:"location", label:"Location", sourceModuleId:"location", badgeKey:"location", supportingDescription:"Where you are willing and able to build your life." },
  { id:"teammates", label:"Teammates", sourceModuleId:"teammates", badgeKey:"teammates", supportingDescription:"The qualities you want in the people working alongside you." },
  { id:"supervisor", label:"Supervisor", sourceModuleId:"supervisor", badgeKey:"supervisor", supportingDescription:"The kind of leadership that helps you do your best work." },
  { id:"growth", label:"Growth", sourceModuleId:"growth", badgeKey:"growth", supportingDescription:"Where you most want to learn, stretch, and develop." },
  { id:"values", label:"Values", sourceModuleId:"values", badgeKey:"values", supportingDescription:"What matters most in the life and work you are building." },
  { id:"x-factor", label:"X-Factor", sourceModuleId:"x-factor", badgeKey:"x-factor", supportingDescription:"The additional experiences, interests, and strengths that uniquely shape you." },
  { id:"salary", label:"Salary", sourceModuleId:"salary", badgeKey:"salary", supportingDescription:"The financial range that helps make your future workable." },
];
export const motivatorById = new Map(motivatorDefinitions.map((item) => [item.id,item]));
