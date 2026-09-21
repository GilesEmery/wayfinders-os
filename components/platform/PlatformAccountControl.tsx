"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { DashboardNavIcon } from "./DashboardNavigation";
import { useWayfindersAuth } from "./WayfindersAuthProvider";
import { buildOperationalNavigation, buildPersonalNavigation, isPersonalNavigationItemActive, type DashboardNavigationGroup } from "@/lib/platform/dashboard-navigation";

function DrawerGroups({ groups, close, pathname, hash }: { groups: DashboardNavigationGroup[]; close: () => void; pathname: string; hash: string }) {
  return <>{groups.map((group) => <section className="platform-menu-group" key={group.label}>
    <h2>{group.label}</h2>
    {group.context ? <Link href={group.context.href} onClick={close}>{group.context.label}</Link> : null}
    {group.items.map((item) => { const active = isPersonalNavigationItemActive(pathname, hash, item.href); return <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={item.href} key={`${group.label}-${item.href}`} onClick={close}><DashboardNavIcon icon={item.icon}/><span>{item.label}</span></Link>; })}
  </section>)}</>;
}

export function PlatformAccountControl() {
  const { account, openAuth } = useWayfindersAuth();
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const pathname = usePathname();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!account) return <button className="platform-account-trigger" onClick={() => openAuth(undefined, "signin")} type="button">Sign In</button>;

  const personalGroups = buildPersonalNavigation();
  const adminGroups = account.adminRole ? buildOperationalNavigation(account.adminRole) : [];
  return <div className="platform-account-control">
    <button aria-expanded={open} aria-haspopup="dialog" aria-label="Open navigation menu" className="platform-menu-trigger" onClick={() => setOpen(true)} type="button"><span>{account.displayName}</span><Menu aria-hidden="true" size={17}/></button>
    {open ? <div className="platform-menu-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside aria-label="Purpose OS navigation" aria-modal="true" className="platform-menu-drawer" role="dialog">
        <header><div><span>Purpose OS</span><strong>{account.displayName}</strong></div><button ref={closeButton} aria-label="Close navigation menu" onClick={() => setOpen(false)} type="button"><X aria-hidden="true" size={20}/></button></header>
        <nav aria-label="Wayfinder navigation"><DrawerGroups groups={personalGroups} close={() => setOpen(false)} pathname={pathname} hash={hash}/>{adminGroups.length ? <div className="platform-menu-admin"><p>Administration</p><DrawerGroups groups={adminGroups} close={() => setOpen(false)} pathname={pathname} hash={hash}/></div> : null}</nav>
        <form action="/api/account/logout" method="post"><button className="platform-menu-logout" type="submit">Log Out</button></form>
      </aside>
    </div> : null}
  </div>;
}
