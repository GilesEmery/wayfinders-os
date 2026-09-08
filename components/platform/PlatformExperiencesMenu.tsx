"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { platformExperienceNavigation } from "@/lib/platform/navigation";

export function PlatformExperiencesMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="platform-experiences-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      ref={root}
    >
      <button
        aria-controls="platform-experiences-menu-panel"
        aria-expanded={open}
        className="platform-experiences-trigger"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => firstLink.current?.focus());
          }
        }}
        ref={trigger}
        type="button"
      >
        Experiences <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="platform-experiences-panel" id="platform-experiences-menu-panel">
          {platformExperienceNavigation.map((item, index) => (
            <Link href={item.href} key={item.href} onClick={() => setOpen(false)} ref={index === 0 ? firstLink : undefined}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
