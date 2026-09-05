"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

export function PlatformAuthGate() {
  const pathname = usePathname();
  const { authenticated, requireAuth } = useWayfindersAuth();
  useEffect(() => {
    if (!authenticated) requireAuth(pathname);
  }, [authenticated, pathname, requireAuth]);
  return null;
}
