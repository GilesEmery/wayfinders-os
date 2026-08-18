import { SetAIcon } from "./set-a/icons";
import { SetBIcon } from "./set-b/icons";
import { SetCIcon } from "./set-c/icons";
import { SetDIcon } from "./set-d/icons";
import type { LMUFamilyIconProps, LMUIconFamily } from "./types";

export const DEFAULT_LMU_ICON_FAMILY: LMUIconFamily = "set-b";

export const lmuIconFamilyMeta: Record<LMUIconFamily, { title: string; description: string; primary?: boolean }> = {
  "set-a": { title: "Set A — Editorial Line", description: "Minimal, geometric line work with a crisp editorial cadence." },
  "set-b": { title: "Set B — Constructed", description: "Earlier architectural exploration built from frames, modules, and structural joins." },
  "set-c": { title: "Set C — Human Gesture", description: "Softer continuous lines with warmth and open, organic movement." },
  "set-d": { title: "Set D — Wayfinding Emblems", description: "Compact symbolic marks held inside bold wayfinding silhouettes." },
};

export const lmuIconFamilyComponents: Record<LMUIconFamily, React.ComponentType<LMUFamilyIconProps>> = {
  "set-a": SetAIcon,
  "set-b": SetBIcon,
  "set-c": SetCIcon,
  "set-d": SetDIcon,
};
