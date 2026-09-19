"use client";

import { useState } from "react";
import type { CompanionModuleType } from "@/lib/experiences/builder/companion";

type MenuItem = {
  type: CompanionModuleType;
  label: string;
  description: string;
  added: boolean;
};

type MenuGroup = {
  id: string;
  label: string;
  description: string;
  items: MenuItem[];
};

export function CompanionAddMenu({ action, groups }: { action: (form: FormData) => void | Promise<void>; groups: MenuGroup[] }) {
  const [selected, setSelected] = useState<Record<string, string[]>>(() => Object.fromEntries(groups.map((group) => [group.id, group.items.filter((item) => item.added).map((item) => item.type)])));

  function selectAll(group: MenuGroup) {
    setSelected((current) => ({
      ...current,
      [group.id]: group.items.map((item) => item.type),
    }));
  }

  function toggle(groupId: string, type: string, checked: boolean) {
    setSelected((current) => {
      const groupSelection = new Set(current[groupId] ?? []);
      if (checked) groupSelection.add(type);
      else groupSelection.delete(type);
      return { ...current, [groupId]: [...groupSelection] };
    });
  }

  return <form action={action} className="companion-add-menu"><div>{groups.map((group) => {
    const groupSelection = selected[group.id] ?? [];
    return <section aria-labelledby={`companion-add-${group.id}`} key={group.id}>
      <header><div><h3 id={`companion-add-${group.id}`}>{group.label}</h3><p>{group.description}</p></div><button onClick={() => selectAll(group)} type="button">Add All</button></header>
      <div className="companion-add-options">{group.items.map((item) => <label key={item.type}>
          <input checked={groupSelection.includes(item.type)} name="module_type" onChange={(event) => toggle(group.id, item.type, event.target.checked)} type="checkbox" value={item.type}/>
          <span><strong>{item.label}</strong><small>{item.description}</small></span>
        </label>)}</div>
    </section>;
  })}</div><button className="companion-add-selected" type="submit">Save Selected</button></form>;
}
