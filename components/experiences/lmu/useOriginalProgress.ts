"use client";

import {
  getProgressSnapshot,
  subscribeToProgress,
} from "@/lib/experiences/lmu/storage";
import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import type { ParticipantModuleProgress } from "@/lib/experiences/lmu/types";
import { useSyncExternalStore } from "react";

const getSnapshot = () => getProgressSnapshot(LMU_ORIGINAL_EXPERIENCE_ID);
const getServerSnapshot = () => "";

export function useOriginalProgress() {
  const snapshot = useSyncExternalStore(subscribeToProgress, getSnapshot, getServerSnapshot);
  return (snapshot ? JSON.parse(snapshot) : []) as ParticipantModuleProgress[];
}
