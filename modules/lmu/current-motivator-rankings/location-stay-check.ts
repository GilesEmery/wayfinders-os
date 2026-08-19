import type { MotivatorId } from "./types";

export function shouldConfirmStayLocationTopChoice({
  hasFinalizedStayLocation,
  proposedTopMotivator,
  checkInResolved,
}: {
  hasFinalizedStayLocation: boolean;
  proposedTopMotivator?: MotivatorId;
  checkInResolved: boolean;
}) {
  return Boolean(
    hasFinalizedStayLocation &&
    proposedTopMotivator &&
    proposedTopMotivator !== "location" &&
    !checkInResolved,
  );
}
