import {
  BadgeDollarSign, Blocks, BookOpen, BriefcaseBusiness, CalendarDays,
  Camera, Church, Code2, Drama, Dumbbell, Flag, Footprints, GraduationCap, Hammer,
  HandHeart, Heart, HeartPulse, House, Landmark, Lightbulb, MessageSquare, MicVocal,
  Monitor, Music2, Palette, PawPrint, PenTool, PencilLine, Plane, Presentation,
  Rocket, Search, Sprout, Trophy, Trees, Users, Utensils, Wrench,
  type LucideIcon,
} from "lucide-react";
import type { RankingIconKey } from "@/lib/experiences/lmu/visuals/ranking-visuals";
import { LMUIconBadge } from "./LMUIconBadge";
import { LMUBadgeIcon } from "../icons/badge/LMUBadgeIcon";

const iconByKey: Record<RankingIconKey, LucideIcon> = {
  story: BookOpen,
  realistic: Hammer,
  social: Users,
  conventional: Blocks,
  artistic: Palette,
  enterprising: Presentation,
  investigative: Search,
  food: Utensils,
  running: Footprints,
  sports: Trophy,
  fitness: Dumbbell,
  music: Music2,
  singing: MicVocal,
  theater: Drama,
  art: Palette,
  design: PenTool,
  writing: PencilLine,
  reading: BookOpen,
  education: GraduationCap,
  teaching: Presentation,
  leadership: Flag,
  business: BriefcaseBusiness,
  entrepreneurship: Rocket,
  sales: BadgeDollarSign,
  technology: Monitor,
  coding: Code2,
  building: Hammer,
  repair: Wrench,
  making: Blocks,
  outdoors: Trees,
  nature: Sprout,
  travel: Plane,
  community: Users,
  volunteering: HandHeart,
  service: HandHeart,
  health: HeartPulse,
  family: House,
  relationships: Heart,
  faith: Church,
  speaking: MessageSquare,
  event: CalendarDays,
  planning: CalendarDays,
  "problem-solving": Lightbulb,
  research: Search,
  finance: Landmark,
  photography: Camera,
  gardening: Sprout,
  animals: PawPrint,
};

export function AdaptiveRankingIcon({ iconKey, active = false }: { iconKey: RankingIconKey; active?: boolean }) {
  if (["story", "realistic", "social", "conventional", "artistic", "enterprising", "investigative"].includes(iconKey)) {
    return <LMUBadgeIcon name={iconKey as "story" | "realistic" | "social" | "conventional" | "artistic" | "enterprising" | "investigative"} state={active ? "active" : "light"} />;
  }
  const Icon = iconByKey[iconKey];
  return <LMUIconBadge active={active}><Icon strokeWidth={1.65} /></LMUIconBadge>;
}
