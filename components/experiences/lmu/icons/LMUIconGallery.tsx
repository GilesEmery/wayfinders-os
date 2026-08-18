"use client";

import { useState } from "react";
import { LMUIcon } from "./LMUIcon";
import { lmuIconFamilies, lmuIconNames } from "./types";
import { lmuIconFamilyMeta } from "./registry";
import { LMUBadgeIcon, type LMUBadgeState } from "./badge/LMUBadgeIcon";
import { AdaptiveRankingCard } from "../ranking/AdaptiveRankingCard";

const labels = { story: "Success Stories", realistic: "Realistic", social: "Social", conventional: "Conventional", artistic: "Artistic", enterprising: "Enterprising", investigative: "Investigative", teammates: "Teammates", supervisor: "Supervisor", values: "Values", growth: "Growth", location: "Location", "x-factor": "X-Factor", salary: "Salary", motivators: "Motivator Rankings" } as const;
const states: Array<{ state: LMUBadgeState; label: string }> = [{ state: "light", label: "Light / inactive" }, { state: "active", label: "Active / current" }, { state: "dark", label: "Dark / emphasis" }, { state: "outlined", label: "Outlined / quiet" }];
const sampleStory = { id: "sample-story", title: "Organized Our Neighborhood Gathering", iconKey: "story" as const, metadata: "Ages 30–35", detailLabel: "What happened?", detailContent: "I brought neighbors together, coordinated the details, and created an experience people wanted to repeat." };

export function LMUIconGallery() {
  const [expanded, setExpanded] = useState(false);
  return <main className="icon-gallery">
    <header className="icon-gallery-hero"><p className="eyebrow eyebrow-rule">Primary LMU direction</p><h1>Wayfinding Badges</h1><p>A unified marker-and-symbol language for Success Stories, Holland Codes, and future Life Mapping U concepts.</p></header>

    <section className="badge-system-preview" aria-labelledby="badge-system-heading">
      <header><div><span className="icon-primary-label">Selected system</span><h2 id="badge-system-heading">LMU Badge Symbols</h2></div><p>A refined flat-topped wayfinding marker with custom-fit symbols and four reusable interface states.</p></header>
      <div className="badge-state-table">
        <div className="badge-table-corner" aria-hidden="true" />
        {states.map(({ state, label }) => <h3 key={state}>{label}</h3>)}
        {lmuIconNames.map((name) => <div className="badge-state-row" key={name}><h3>{labels[name]}</h3>{states.map(({ state, label }) => <div key={state}><small>{label}</small><LMUBadgeIcon name={name} state={state} size={58} label={`${labels[name]}, ${label}`} /></div>)}</div>)}
      </div>
    </section>

    <section className="icon-live-preview"><div><p className="eyebrow">Success Story in context</p><AdaptiveRankingCard item={sampleStory} expanded={expanded} onToggle={() => setExpanded((value) => !value)} onSelect={() => undefined} selectionLabel="Choose this story" /></div><div className="holland-preview badge-holland-preview"><p className="eyebrow">Holland code row</p>{lmuIconNames.filter((name) => name !== "story").map((name, index) => <div key={name}><LMUBadgeIcon name={name} state={index === 0 ? "active" : "light"} /><span>{labels[name]}</span></div>)}</div></section>

    <section className="legacy-icon-explorations"><header><p className="eyebrow">Reference archive</p><h2>Earlier Family Explorations</h2><p>Sets A–D remain available temporarily for comparison, but they are no longer the primary LMU direction.</p></header><div className="icon-family-grid">{lmuIconFamilies.map((family) => <section className="icon-family-panel" key={family}><header><h2>{lmuIconFamilyMeta[family].title}</h2><p>{lmuIconFamilyMeta[family].description}</p></header><div className="icon-specimen-grid">{lmuIconNames.filter((name) => !["teammates", "supervisor", "values", "growth", "location", "salary", "motivators"].includes(name)).map((name) => <article key={name}><span className="icon-standalone charcoal"><LMUIcon family={family} name={name} size={32} title={`${labels[name]}, ${lmuIconFamilyMeta[family].title}`} /></span><h3>{labels[name]}</h3></article>)}</div></section>)}</div></section>
  </main>;
}
