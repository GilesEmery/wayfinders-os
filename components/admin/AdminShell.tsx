"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminBuildBlueprint } from "@/components/admin/AdminBuildBlueprint";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import type { AdminIdentity } from "@/lib/admin/auth";
import { blueprintForPath } from "@/lib/admin/build-blueprints";

export function AdminShell({ children, showAutomaticBlueprint = true, focused = false }: { admin: AdminIdentity; children: ReactNode; showAutomaticBlueprint?: boolean; focused?: boolean }) {
  const pathname = usePathname();
  const developmentBlueprint = showAutomaticBlueprint && process.env.NODE_ENV === "development" ? blueprintForPath(pathname) : undefined;
  return <div className={`admin-platform-shell${focused ? " is-focused-builder" : ""}`}><PlatformHeader/><div className="admin-shell"><div className="admin-workspace"><main className="admin-content">{children}{developmentBlueprint ? <AdminBuildBlueprint blueprint={developmentBlueprint}/> : null}</main></div></div></div>;
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="admin-page-heading"><div><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{description && <p className="admin-lede">{description}</p>}</div>{action && <div className="admin-page-action">{action}</div>}</div>; }
export function AdminEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <section className="admin-empty-state"><span>ARCHITECTURE READY</span><h2>{title}</h2><p>{description}</p>{action}</section>; }
export function LMUAdminBadge() { return <span className="admin-lmu-badge"><Image src="/brand/lmu/lmu-u-mark-white.png" alt="Life Mapping U" width={44} height={44}/></span>; }
