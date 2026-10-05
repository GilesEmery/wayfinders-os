"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AdminBuildBlueprint } from "@/components/admin/AdminBuildBlueprint";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import type { AdminIdentity } from "@/lib/admin/auth";
import { blueprintForPath } from "@/lib/admin/build-blueprints";

function AdminHistoryNavigation() {
  const router = useRouter();
  return <nav className="admin-history-navigation" aria-label="Page history">
    <button type="button" className="admin-history-button" aria-label="Go back" title="Go back" onClick={() => window.history.length > 1 ? router.back() : router.push("/admin")}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14"/></svg>
    </button>
    <button type="button" className="admin-history-button" aria-label="Go forward" title="Go forward" onClick={() => router.forward()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5 7 7-7 7M19 12H5"/></svg>
    </button>
  </nav>;
}

export function AdminShell({ children, showAutomaticBlueprint = true, focused = false }: { admin: AdminIdentity; children: ReactNode; showAutomaticBlueprint?: boolean; focused?: boolean }) {
  const pathname = usePathname();
  const developmentBlueprint = showAutomaticBlueprint && process.env.NODE_ENV === "development" ? blueprintForPath(pathname) : undefined;
  return <div className={`admin-platform-shell${focused ? " is-focused-builder" : ""}`}><PlatformHeader/><div className="admin-shell"><div className="admin-workspace"><main className="admin-content"><AdminHistoryNavigation/>{children}{developmentBlueprint ? <AdminBuildBlueprint blueprint={developmentBlueprint}/> : null}</main></div></div></div>;
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="admin-page-heading"><div><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{description && <p className="admin-lede">{description}</p>}</div>{action && <div className="admin-page-action">{action}</div>}</div>; }
export function AdminEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <section className="admin-empty-state"><span>ARCHITECTURE READY</span><h2>{title}</h2><p>{description}</p>{action}</section>; }
export function LMUAdminBadge() { return <span className="admin-lmu-badge"><Image src="/brand/lmu/lmu-u-mark-white.png" alt="Life Mapping U" width={44} height={44}/></span>; }
