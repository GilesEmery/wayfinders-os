import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";
import { LMUVideoPlayer } from "./video/LMUVideoPlayer";

type LMUInstructionalVideoProps = LMUInstructionalMedia & { className?: string };

/** Stable module-facing entry point; provider details stay behind LMUVideoPlayer. */
export function LMUInstructionalVideo(props: LMUInstructionalVideoProps) {
  return <LMUVideoPlayer {...props} />;
}
