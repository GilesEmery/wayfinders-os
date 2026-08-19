"use client";

import { useSyncExternalStore } from "react";

function isLocalTestingHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
}

/** Enables browser-only testing helpers without changing production progression. */
export function useLocalhostTesting() {
  return useSyncExternalStore(
    () => () => undefined,
    () => process.env.NODE_ENV === "development" && isLocalTestingHost(window.location.hostname),
    () => false,
  );
}
