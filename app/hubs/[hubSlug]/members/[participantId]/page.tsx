import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getPlatformUser } from "@/lib/platform/auth";
import { hasPermission, resolveEffectiveAccess } from "@/lib/platform/effective-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function HubMemberProfile({ params }: { params: Promise<{ hubSlug: string; participantId: string }> }) {
  const { hubSlug, participantId } = await params;
  const user = await getPlatformUser();
  if (!user) notFound();
  const db = createAdminSupabaseClient();
  const { data: hub } = await db.from("hubs").select("id,name,slug").eq("slug", hubSlug).eq("status", "active").maybeSingle();
  if (!hub) notFound();
  const access = await resolveEffectiveAccess(user.id);
  if (!hasPermission(access, "wayfinder.view", { scope: { type: "hub", id: hub.id } })) notFound();
  const { data: membership } = await db.from("hub_memberships").select("id").eq("hub_id", hub.id).eq("participant_id", participantId).eq("status", "active").maybeSingle();
  if (!membership) notFound();
  const { data: person, error } = await db.from("participants").select("full_name,first_name,preferred_name,email,phone,city,state_region,country,timezone,short_bio").eq("id", participantId).maybeSingle();
  if (error) throw new Error("Unable to load member profile.");
  if (!person) notFound();
  return <PlatformShell><main className="hub-context-page"><Link href={`/hubs/${encodeURIComponent(hub.slug)}`}>← Back to {hub.name}</Link><header><p className="platform-eyebrow">Wayfinder Profile · {hub.name}</p><h1>{person.full_name || person.first_name}</h1>{person.short_bio && <p>{person.short_bio}</p>}</header><section><h2>Profile and contact information</h2><dl className="hub-profile-details">{[["Preferred name", person.preferred_name], ["Email", person.email], ["Phone", person.phone], ["Location", [person.city, person.state_region, person.country].filter(Boolean).join(", ")], ["Timezone", person.timezone]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}</dl></section></main></PlatformShell>;
}
