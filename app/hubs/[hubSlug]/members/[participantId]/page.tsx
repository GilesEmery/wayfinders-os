import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformUser } from "@/lib/platform/auth";
import { resolveEffectiveAccess, type EffectiveAccessSnapshot } from "@/lib/platform/effective-access";
import { canReadHubContacts } from "@/lib/platform/hub-directory";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function HubMemberProfile({ params }: { params: Promise<{ hubSlug: string; participantId: string }> }) {
  const { hubSlug, participantId } = await params;
  const user = await getPlatformUser();
  if (!user) notFound();
  const db = createAdminSupabaseClient();
  const { data: hub, error: hubError } = await db.from("hubs").select("id,name,slug").eq("slug", hubSlug).eq("status", "active").maybeSingle();
  if (hubError) throw new Error("Hub information is unavailable.");
  if (!hub) notFound();
  let access: EffectiveAccessSnapshot;
  try { access = await resolveEffectiveAccess(user.id); }
  catch { return <PlatformShell><main><p role="alert">Member access could not be verified. Please reload and try again.</p></main></PlatformShell>; }
  if (!canReadHubContacts(access, hub.id)) notFound();
  const { data: membership, error: membershipError } = await db.from("hub_memberships").select("id").eq("hub_id", hub.id).eq("participant_id", participantId).eq("status", "active").maybeSingle();
  if (membershipError) throw new Error("Member access could not be verified.");
  if (!membership) notFound();
  const { data: person, error } = await db.from("participants").select("full_name,first_name,preferred_name,email,phone,city,state_region,country,timezone,short_bio").eq("id", participantId).maybeSingle();
  if (error) throw new Error("Unable to load member profile.");
  if (!person) notFound();
  return <PlatformShell><main className="hub-context-page"><Link href={`/hubs/${encodeURIComponent(hub.slug)}`}>← Back to {hub.name}</Link><header><p className="platform-eyebrow">Wayfinder Profile · {hub.name}</p><h1>{person.full_name || person.first_name}</h1>{person.short_bio && <p>{person.short_bio}</p>}</header><section><h2>Profile and contact information</h2><dl className="hub-profile-details">{[["Preferred name", person.preferred_name], ["Email", person.email], ["Phone", person.phone], ["Location", [person.city, person.state_region, person.country].filter(Boolean).join(", ")], ["Timezone", person.timezone]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}</dl></section></main></PlatformShell>;
}
