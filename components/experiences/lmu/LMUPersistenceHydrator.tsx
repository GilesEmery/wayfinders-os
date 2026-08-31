"use client";

import { useEffect } from "react";
import { hydrateFromServer } from "@/lib/experiences/lmu/storage";
import { loadServerAssessment } from "@/lib/experiences/lmu/persistence";

export function LMUPersistenceHydrator() {
  useEffect(() => {
    let active = true;
    void loadServerAssessment().then((assessment) => {
      if (active && assessment) hydrateFromServer(assessment);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return null;
}
