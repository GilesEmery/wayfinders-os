"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

export function PlatformAuthGate() {
  const pathname = usePathname();
  const { authenticated, ready, requireAuth } = useWayfindersAuth();
  useEffect(() => {
    if (ready && !authenticated) requireAuth(pathname);
  }, [authenticated, ready, pathname, requireAuth]);
  return null;
}
