import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminIdentity } from "@/lib/admin/auth";

export function AdminShell({ admin, children }: { admin: AdminIdentity; children: ReactNode }) {
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-wordmark" href="/admin">Wayfinders OS</Link><nav aria-label="Admin navigation"><p>Dashboard</p><Link href="/admin">Overview</Link><p>Experiences</p><Link href="/admin/life-mapping-u">Life Mapping U</Link><p>Administration</p><Link href="/admin/admins">Administrators</Link></nav></aside><div className="admin-workspace"><header className="admin-header"><strong>WAYFINDERS OS</strong><div><span>{admin.email}</span><form action="/api/admin/logout" method="post"><button>SIGN OUT</button></form></div></header><main className="admin-content">{children}</main></div></div>;
}

export function LMUAdminBadge() {
  return <span className="admin-lmu-badge"><Image src="/brand/lmu/lmu-u-mark-white.png" alt="Life Mapping U" width={44} height={44} /></span>;
}
