import type { Metadata } from "next";
import { AccountSettings } from "@/components/platform/AccountSettings";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformAccount } from "@/lib/platform/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const account = await getPlatformAccount();
  return <PlatformShell>
    {!account ? <PlatformAuthGate /> : <section className="account-page">
      <header><p className="platform-eyebrow">Wayfinders OS</p><h1>Account</h1><p>Manage the profile and security attached to your Wayfinders identity.</p></header>
      <AccountSettings account={account} />
    </section>}
  </PlatformShell>;
}
