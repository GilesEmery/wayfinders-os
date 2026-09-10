"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export const PURPOSE_OS_SIDEBAR_SCROLL_KEY = "purpose-os:sidebar-scroll:unified";

export function useSidebarScrollPersistence(storageKey: string) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored === null) return;
    const scrollTop = Number(stored);
    if (!Number.isFinite(scrollTop)) return;
    sidebar.scrollTop = scrollTop;
    const frame = window.requestAnimationFrame(() => { sidebar.scrollTop = scrollTop; });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, storageKey]);

  const rememberScroll = useCallback(() => {
    const sidebar = sidebarRef.current;
    if (sidebar) window.sessionStorage.setItem(storageKey, String(sidebar.scrollTop));
  }, [storageKey]);

  return { sidebarRef, rememberScroll };
}
