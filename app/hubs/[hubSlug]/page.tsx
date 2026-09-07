import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubDefaultControl } from "@/components/platform/HubDefaultControl";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { getAuthorizationContext, canManageHub } from "@/lib/platform/authorization";
import { ensurePlatformProfile, getPlatformUser } from "@/lib/platform/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Hub" };

export default async function HubPage({ params }: { params: Promise<{ hubSlug: string }> }) {
  const { hubSlug } = await params; const db = createAdminSupabaseClient();
  const { data: hub } = await db.from("hubs").select("id,name,slug,description,membership_mode,status").eq("slug", hubSlug).eq("status", "active").maybeSingle();
  if (!hub) notFound();
  const user = await getPlatformUser(); const context = user ? await getAuthorizationContext(user.id) : null;
  const profile = user ? await ensurePlatformProfile(user) : null; const participant = profile && !("error" in profile) ? profile.participant : null;
  const manager = canManageHub(context, hub.id);
  const [{ data: membership }, { data: preference }] = await Promise.all([
    participant ? db.from("hub_memberships").select("membership_role,status").eq("participant_id", participant.id).eq("hub_id", hub.id).eq("status", "active").maybeSingle() : Promise.resolve({ data: null }),
    participant ? db.from("participant_preferences").select("default_hub_id").eq("participant_id", participant.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: offerings } = await db.from("experience_offerings").select("id,name,slug,experience_id,visibility,access_mode,starts_at,ends_at").eq("hub_id", hub.id).eq("status", "active").in("visibility", membership || manager ? ["public", "unlisted", "private"] : ["public"]).order("name");
  const experienceIds = [...new Set((offerings ?? []).map((item) => item.experience_id))];
  const { data: experiences } = experienceIds.length ? await db.from("experiences").select("id,name,slug,experience_type,accent_color").in("id", experienceIds) : { data: [] };
  const experienceById = new Map((experiences ?? []).map((item) => [item.id, item]));
  return <PlatformShell><main className="hub-context-page">
    <header><p className="platform-eyebrow">Purpose OS Hub</p><h1>{hub.name}</h1><p>{hub.description || "A local Purpose OS community for shared journey, formation, and meaningful action."}</p><div className="hub-context-status">{membership ? <span>Member · {membership.membership_role.replaceAll("_", " ")}</span> : <span>{hub.membership_mode.replaceAll("_", " ")}</span>}{manager && <Link href="/admin/organizations">Manage Hub</Link>}</div>{participant && membership && <HubDefaultControl hubId={hub.id} isDefault={preference?.default_hub_id === hub.id}/>}</header>
    <section className="hub-offerings"><p className="platform-eyebrow">Available here</p><h2>Experiences &amp; Offerings</h2>{offerings?.length ? <div>{offerings.map((offering) => { const experience = experienceById.get(offering.experience_id); return <article key={offering.id} style={{ "--journey-accent": experience?.accent_color ?? "#303534" } as React.CSSProperties}><span>{experience?.experience_type?.replaceAll("_", " ") ?? "Experience"}</span><h3>{offering.name}</h3><p>{experience?.name && experience.name !== offering.name ? `${experience.name} offered in ${hub.name}.` : `Available in ${hub.name}.`}</p></article>; })}</div> : <p className="dashboard-empty">No active Hub offerings are available yet.</p>}</section>
  </main></PlatformShell>;
}
