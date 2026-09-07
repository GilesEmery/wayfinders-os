import type { Metadata } from "next";
import Link from "next/link";
import { AccountSettings } from "@/components/platform/AccountSettings";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformAccount } from "@/lib/platform/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const account = await getPlatformAccount();
  return <PlatformShell>
    {!account ? <PlatformAuthGate /> : <section className="account-page">
      <header><p className="platform-eyebrow">Purpose OS</p><h1>Account</h1><p>Manage the profile and security attached to your global Wayfinder identity.</p><Link className="account-dashboard-link" href="/dashboard">View My Dashboard →</Link></header>
      <AccountSettings account={account} />
    </section>}
  </PlatformShell>;
}
