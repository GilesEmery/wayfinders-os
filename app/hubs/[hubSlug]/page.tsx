import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubMemberDirectory } from "@/components/platform/HubMemberDirectory";
import { resolveEffectiveAccess, type EffectiveAccessSnapshot } from "@/lib/platform/effective-access";
import { loadHubDirectory, canReadHubContacts } from "@/lib/platform/hub-directory";
import { HubDefaultControl } from "@/components/platform/HubDefaultControl";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getAuthorizationContext, canManageHub, type PlatformAuthorizationContext } from "@/lib/platform/authorization";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Hub" };

export default async function HubPage({ params }: { params: Promise<{ hubSlug: string }> }) {
  const { hubSlug } = await params; const db = createAdminSupabaseClient();
  const { data: hub, error: hubError } = await db.from("hubs").select("id,name,slug,description,membership_mode,status").eq("slug", hubSlug).eq("status", "active").maybeSingle();
  if (hubError) throw new Error("Hub information is unavailable.");
  if (!hub) notFound();
  const user = await getPlatformUser();
  let context: PlatformAuthorizationContext | null = null;
  let access: EffectiveAccessSnapshot | null = null;
  if (user) {
    try { [context, access] = await Promise.all([getAuthorizationContext(user.id), resolveEffectiveAccess(user.id)]); }
    catch { return <PlatformShell><main><p role="alert">Hub access could not be verified. Please reload and try again.</p></main></PlatformShell>; }
  }
  const profile = user ? await ensurePlatformProfile(user) : null; const participant = profile && !("error" in profile) ? profile.participant : null;
  const manager = canManageHub(context, hub.id);
  const [membershipRead, preferenceRead] = await Promise.all([
    participant ? db.from("hub_memberships").select("membership_role,status").eq("participant_id", participant.id).eq("hub_id", hub.id).eq("status", "active").maybeSingle() : Promise.resolve({ data: null }),
    participant ? db.from("participant_preferences").select("default_hub_id").eq("participant_id", participant.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (("error" in membershipRead && membershipRead.error) || ("error" in preferenceRead && preferenceRead.error)) throw new Error("Hub access could not be verified.");
  const membership = membershipRead.data, preference = preferenceRead.data;
  const { data: offerings } = await db.from("experience_offerings").select("id,name,slug,experience_id,visibility,access_mode,starts_at,ends_at").eq("hub_id", hub.id).eq("status", "active").in("visibility", membership || manager ? ["public", "unlisted", "private"] : ["public"]).order("name");
  const experienceIds = [...new Set((offerings ?? []).map((item) => item.experience_id))];
  const { data: experiences } = experienceIds.length ? await db.from("experiences").select("id,name,slug,experience_type,accent_color").in("id", experienceIds) : { data: [] };
  const experienceById = new Map((experiences ?? []).map((item) => [item.id, item]));
  const canViewProfiles = Boolean(access && canReadHubContacts(access, hub.id));
  const people = await loadHubDirectory(db, hub.id, user?.id ?? null, context, access);
  const members = (people ?? []).map(person => {
    const name = person.full_name?.trim() || person.first_name;
    const parts = name.trim().split(/\s+/);
    return { name, initials: `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase(), href: canViewProfiles ? context?.globalRole ? `/admin/users/${person.id}` : `/hubs/${encodeURIComponent(hub.slug)}/members/${person.id}` : null };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return <PlatformShell><main className="hub-context-page">
    <header><p className="platform-eyebrow">Purpose OS Hub</p><h1>{hub.name}</h1><p>{hub.description || "A local Purpose OS community for shared journey, formation, and meaningful action."}</p><div className="hub-context-status">{membership ? <span>Member · {membership.membership_role.replaceAll("_", " ")}</span> : <span>{hub.membership_mode.replaceAll("_", " ")}</span>}{manager && <Link href="/admin/organizations">Manage Hub</Link>}</div>{participant && membership && <HubDefaultControl hubId={hub.id} isDefault={preference?.default_hub_id === hub.id}/>}</header>
    <section className="hub-offerings"><p className="platform-eyebrow">Available here</p><h2>Experiences &amp; Offerings</h2>{offerings?.length ? <div>{offerings.map((offering) => { const experience = experienceById.get(offering.experience_id); return <article key={offering.id} style={{ "--journey-accent": experience?.accent_color ?? "#303534" } as React.CSSProperties}><span>{experience?.experience_type?.replaceAll("_", " ") ?? "Experience"}</span><h3>{offering.name}</h3><p>{experience?.name && experience.name !== offering.name ? `${experience.name} offered in ${hub.name}.` : `Available in ${hub.name}.`}</p></article>; })}</div> : <p className="dashboard-empty">No active Hub offerings are available yet.</p>}</section>
    {people !== null && <HubMemberDirectory members={members}/>}
  </main></PlatformShell>;
}
