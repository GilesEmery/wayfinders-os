import type { Metadata } from "next";
import Link from "next/link";
import { AccountSettings } from "@/components/platform/AccountSettings";
import { PlatformAuthGate } from "@/components/platform/PlatformAuthGate";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformAccount } from "@/lib/platform/auth";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const account = await getPlatformAccount();
  const user = account ? await getPlatformUser() : null;
  const profile = user ? await ensurePlatformProfile(user) : null;
  let hubSettings = { hubs: [] as Array<{ id: string; name: string; slug: string; membership_mode: string }>, membershipIds: [] as string[], defaultHubId: null as string | null };
  if (profile && !("error" in profile)) {
    const db = createAdminSupabaseClient();
    const [{ data: hubs }, { data: memberships }, { data: preferences }] = await Promise.all([
      db.from("hubs").select("id,name,slug,membership_mode").eq("status", "active").order("name"),
      db.from("hub_memberships").select("hub_id").eq("participant_id", profile.participant.id).eq("status", "active"),
      db.from("participant_preferences").select("default_hub_id").eq("participant_id", profile.participant.id).maybeSingle(),
    ]);
    hubSettings = { hubs: hubs ?? [], membershipIds: (memberships ?? []).map((item) => item.hub_id), defaultHubId: preferences?.default_hub_id ?? null };
  }
  return <PlatformShell>
    {!account ? <PlatformAuthGate /> : <section className="account-page">
      <header><p className="platform-eyebrow">Purpose OS</p><h1>Account</h1><p>Manage the profile and security attached to your global Wayfinder identity.</p><Link className="account-dashboard-link" href="/dashboard">View My Dashboard →</Link></header>
      <AccountSettings account={account} hubSettings={hubSettings}/>
    </section>}
  </PlatformShell>;
}
