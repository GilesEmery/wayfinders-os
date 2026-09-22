import { notFound } from "next/navigation";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PublicLandingAuthLink } from "@/components/platform/PublicLandingAuthLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function HubEntryPage({ params }: { params: Promise<{ hubSlug: string }> }) {
  const { hubSlug } = await params;
  const { data: hub } = await createAdminSupabaseClient().from("hubs").select("id,name,slug,description,location").eq("slug", hubSlug).eq("status", "active").eq("membership_mode", "open").maybeSingle();
  if (!hub) notFound();
  return <div className="hub-entry-page"><PlatformHeader/><main><p className="platform-eyebrow">A Wayfinders Hub</p><h1>{hub.name}</h1><p>{hub.description || "Connect, learn, grow, and pursue meaningful impact alongside your local Wayfinders community."}</p><div><PublicLandingAuthLink mode="signup" signedOutLabel={`Join ${hub.name}`}/><PublicLandingAuthLink signedOutLabel="Sign in"/></div><small>Creating an account or signing in from this page connects your PurposeOS profile to {hub.name}. You can change your primary Hub later in Account Settings.</small></main><PlatformFooter/></div>;
}
