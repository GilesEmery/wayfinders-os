import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PlatformAuthorizationContext } from "./authorization";
import { hasPermission, type EffectiveAccessSnapshot } from "./effective-access-policy";

// Inputs are fresh server snapshots. A global role is not directory membership.
export async function loadHubDirectory(db: SupabaseClient<Database>, hubId: string, authUserId: string | null, context: PlatformAuthorizationContext | null, access: EffectiveAccessSnapshot | null) {
  if (!authUserId || context?.authUserId !== authUserId || access?.authUserId !== authUserId || !access.isActiveMember) return null;
  if (access.permissionOverrides.some(o => o.key === "hub.view" && o.effect === "deny"
    && (o.scope.type === "platform" || o.scope.type === "hub" && o.scope.id === hubId))) return null;
  const person = await db.from("participants").select("id").eq("auth_user_id", authUserId).maybeSingle();
  if (person.error) throw new Error("Hub directory access could not be verified.");
  if (!person.data) return null;
  const membership = await db.from("hub_memberships").select("participant_id,hub_id,status").eq("participant_id", person.data.id).eq("hub_id", hubId).maybeSingle();
  if (membership.error) throw new Error("Hub directory access could not be verified.");
  const member = membership.data;
  if (member && (member.participant_id !== person.data.id || member.hub_id !== hubId || member.status !== "active")) return null;
  const leader = context.assignments.some(a => a.role === "hub_leader" && a.scope_type === "hub" && a.scope_id === hubId)
    && hasPermission(access, "hub.view", { scope: { type: "hub", id: hubId } });
  if (!member && !leader) return null;
  const roster = await db.from("hub_memberships").select("participant_id", { count: "exact" }).eq("hub_id", hubId).eq("status", "active");
  if (roster.error) throw new Error("Hub directory is unavailable.");
  if (!Array.isArray(roster.data) || roster.count !== roster.data.length) throw new Error("Hub directory is incomplete. Please try again.");
  const ids = [...new Set((roster.data ?? []).map(row => row.participant_id))];
  if (!ids.length) return [];
  const names = await db.from("participants").select("id,full_name,first_name").in("id", ids);
  if (names.error) throw new Error("Hub directory is unavailable.");
  // Reject truncated/duplicate/mismatched name results instead of pretending complete.
  if (names.data?.length !== ids.length || new Set(names.data.map(row => row.id)).size !== ids.length || names.data.some(row => !ids.includes(row.id))) throw new Error("Hub directory is incomplete. Please try again.");
  return names.data;
}

// Existing exact-Hub wayfinder.view overrides supply explicit contact authority.
// Inherited leadership/global permissions alone are insufficient.
export function canReadHubContacts(access: EffectiveAccessSnapshot, hubId: string) {
  if (!access.isActiveMember) return false;
  const scoped = access.permissionOverrides.filter(o => o.key === "wayfinder.view" && o.scope.type === "hub" && o.scope.id === hubId);
  if (!scoped.some(o => o.effect === "allow")) return false;
  if (access.permissionOverrides.some(o => o.key === "wayfinder.view" && o.effect === "deny" && (o.scope.type === "platform" || o.scope.type === "hub" && o.scope.id === hubId))) return false;
  return hasPermission(access, "wayfinder.view", { scope: { type: "hub", id: hubId } });
}
