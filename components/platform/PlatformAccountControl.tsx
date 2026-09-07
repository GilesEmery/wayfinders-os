"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

export function PlatformAccountControl() {
  const { account, openAuth } = useWayfindersAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!account) return <button className="platform-account-trigger" onClick={() => openAuth(undefined, "signin")} type="button">Sign In</button>;

  return <div className="platform-account-control" ref={root}>
    <button aria-expanded={open} aria-haspopup="menu" className="platform-account-trigger" onClick={() => setOpen((value) => !value)} type="button">
      <span>{account.displayName}</span>
    </button>
    {open && <div className="platform-account-menu" role="menu">
      {account.isAdmin && <Link href="/admin" onClick={() => setOpen(false)} role="menuitem">Admin</Link>}
      <Link href="/account" onClick={() => setOpen(false)} role="menuitem">Account</Link>
      <form action="/api/account/logout" method="post"><button role="menuitem" type="submit">Log Out</button></form>
    </div>}
  </div>;
}
