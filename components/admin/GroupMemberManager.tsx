"use client";

import { useMemo, useState } from "react";
import { addGroupMemberAction, removeGroupMemberAction, setGroupMemberRoleAction } from "@/app/admin/trainings/[experienceId]/delivery/group-actions";

type Person = Readonly<{ id: string; name: string; email: string; enrollmentId?: string }>;
type Member = Readonly<{ id: string; name: string; role: string }>;

export function GroupMemberManager({ experienceId, offeringId, people, members }: { experienceId: string; offeringId: string; people: Person[]; members: Member[] }) {
  const [query, setQuery] = useState("");
  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return people.filter((person) => !memberIds.has(person.id) && (!normalized || `${person.name} ${person.email}`.toLowerCase().includes(normalized))).slice(0, 30);
  }, [memberIds, people, query]);
  return <div className="group-member-manager">
    <div className="group-member-list" aria-label="Current Cohort members">{members.map((member) => <article key={member.id}><div><strong>{member.name}</strong><span>{member.role === "facilitator" ? "Leader / Facilitator" : "Member"}</span></div><div className="group-member-actions"><form action={setGroupMemberRoleAction.bind(null, experienceId, offeringId, member.id, member.role === "facilitator" ? "participant" : "facilitator")}><button>{member.role === "facilitator" ? "Make Member" : "Make Leader"}</button></form><form action={removeGroupMemberAction.bind(null, experienceId, offeringId, member.id)}><button aria-label={`Remove ${member.name} from Cohort`}>Remove</button></form></div></article>)}{!members.length && <p>No members have been added to this Cohort.</p>}</div>
    <form className="group-member-add" action={addGroupMemberAction.bind(null, experienceId, offeringId)}><label>Search Wayfinders<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" autoComplete="off"/></label><label>Add Member<select name="participant_id" required defaultValue=""><option value="" disabled>{available.length ? "Choose a Wayfinder" : "No matching Wayfinders"}</option>{available.map((person) => <option value={person.id} key={person.id}>{person.name}{person.email ? ` · ${person.email}` : ""}</option>)}</select></label><button className="admin-secondary">Add Member</button><small>Membership may be created before Course enrollment. It does not create or duplicate a Course enrollment.</small></form>
  </div>;
}
