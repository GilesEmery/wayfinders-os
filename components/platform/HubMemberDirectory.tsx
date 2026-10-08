"use client";

import Link from "next/link";
import { useState } from "react";

export function HubMemberDirectory({ members }: { members: { name: string; initials: string; href: string | null }[] }) {
  const [search, setSearch] = useState("");
  const visible = members.filter(member => member.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="hub-member-directory" aria-labelledby="hub-members-heading"><p className="platform-eyebrow">Our community</p><h2 id="hub-members-heading">Wayfinders in this Hub</h2><label className="hub-member-search">Search members<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name"/></label><p role="status">{visible.length} {visible.length === 1 ? "member" : "members"}</p><ul>{visible.map((member, index) => <li key={`${member.name}-${index}`}><span className="hub-member-avatar" aria-hidden="true">{member.initials}</span>{member.href ? <Link href={member.href}>{member.name}</Link> : <span>{member.name}</span>}</li>)}</ul>{!visible.length && <p>{members.length ? "No members match your search." : "No members are listed yet."}</p>}</section>;
}
