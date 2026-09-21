"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWayfindersAuth } from "./WayfindersAuthProvider";

type PublicLandingAuthLinkProps = {
  children?: ReactNode;
  className?: string;
  signedInLabel?: string;
  signedOutLabel?: string;
};

export function PublicLandingAuthLink({
  children,
  className,
  signedInLabel = "Go to Dashboard",
  signedOutLabel = "Sign In",
}: PublicLandingAuthLinkProps) {
  const router = useRouter();
  const { authenticated, openAuth } = useWayfindersAuth();
  const label = children ?? (authenticated ? signedInLabel : signedOutLabel);

  return (
    <button className={className} onClick={() => authenticated ? router.push("/dashboard") : openAuth("/dashboard", "signin")} type="button">
      {label}
    </button>
  );
}
