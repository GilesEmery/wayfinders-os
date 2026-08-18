"use client";

import { usePathname } from "next/navigation";
import { usePageStart } from "./usePageStart";

export function LMURouteScrollReset() {
  usePageStart(usePathname());
  return null;
}
