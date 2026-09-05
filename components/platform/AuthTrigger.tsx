"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

export function AuthTrigger({ children, className, destination, mode = "signin" }: { children: ReactNode; className?: string; destination: string; mode?: "signin" | "signup" }) {
  const router = useRouter();
  const { authenticated, openAuth } = useWayfindersAuth();
  return <button className={className} onClick={() => authenticated ? router.push(destination) : openAuth(destination, mode)} type="button">{children}</button>;
}
