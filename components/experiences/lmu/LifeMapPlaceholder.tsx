"use client";

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { getLifeMapSectionResult, getOrderedLifeMapPriorities, type LifeMapSectionResult, type OrderedLifeMapPriority } from "@/lib/experiences/lmu/life-map-results";
import { LMU_ORIGINAL_EXPERIENCE_ID, originalDiscoveryModules } from "@/lib/experiences/lmu/original-journey";
import { postExperienceResources } from "@/lib/experiences/lmu/post-experience-resources";
import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";
import type { SuccessStoriesResponse } from "@/modules/lmu/success-stories/types";
import type { TransferableSkillsResponse } from "@/modules/lmu/transferable-skills/types";
import { transferableSkillCategories } from "@/modules/lmu/transferable-skills/curriculum";
import type { TeammatesResponse } from "@/modules/lmu/teammates/types";
import type { SupervisorResponse } from "@/modules/lmu/supervisor/types";
import type { ValuesResponse } from "@/modules/lmu/values/types";
import { selectedLMUValues } from "@/modules/lmu/values/storage";
import type { GrowthResponse } from "@/modules/lmu/growth/types";
import { resolveGrowthCandidates } from "@/modules/lmu/growth/storage";
import type { LocationResponse } from "@/modules/lmu/location/types";
import { relocationLabel } from "@/modules/lmu/location/curriculum";
import type { XFactorResponse } from "@/modules/lmu/x-factor/types";
import { allXFactorItems } from "@/modules/lmu/x-factor/storage";
import { xFactorQuestionById } from "@/modules/lmu/x-factor/curriculum";
import type { SalaryResponse } from "@/modules/lmu/salary/types";
import type { LMUIconName } from "./icons/types";
import { LMUBadgeIcon } from "./icons/badge/LMUBadgeIcon";
import { LifeMapPrintTrigger } from "./LifeMapPrintTrigger";
import { LifeMapPdfDownload, type LifeMapPdfSection } from "./LifeMapPdfDownload";
import { LMULogo } from "./LMULogo";
import { LMUShell } from "./LMUShell";
import { MapAccent } from "./MapAccent";
import { ModuleStartOverControl } from "./ModuleStartOverControl";
import { SalaryRangeMeter } from "./SalaryModule";
import { compensationPerspective } from "@/modules/lmu/salary/tradeoffs";
import { SecondaryButton } from "./SecondaryButton";
import { useOriginalProgress } from "./useOriginalProgress";

const badges: Record<string, LMUIconName> = { "success-stories":"story", "transferable-skills":"realistic", teammates:"teammates", supervisor:"supervisor", values:"values", growth:"growth", location:"location", "x-factor":"x-factor", salary:"salary" };
const allTransferableSkills = transferableSkillCategories.flatMap((category) => category.skills);
const growthEdgeLabels = { familiar: "Familiar", develop: "Develop", stretch: "Stretch", experiment: "Experiment", leap: "Leap" } as const;

export function LifeMapPlaceholder({ module, printMode=false }: { module: LMUModuleDefinition; printMode?: boolean }) {
  const progress=useOriginalProgress(); const completed=new Set(progress.filter((item)=>item.status==="completed").map((item)=>item.moduleId)); const total=originalDiscoveryModules.length; const completedCount=originalDiscoveryModules.filter((item)=>completed.has(item.id)).length; const isReady=completedCount===total; const foundation=getLifeMapSectionResult("success-stories",progress); const ordered=getOrderedLifeMapPriorities(progress); const mapSections=[foundation,...ordered]; const rankingComplete=ordered.some((item)=>item.priorityRank===1);
  const [expanded,setExpanded]=useState<string[]>([]); const [expandedStories,setExpandedStories]=useState<string[]>([]); const response=<T,>(id:string)=>progress.find((item)=>item.moduleId===id)?.responses as unknown as T|undefined;
  const mapGridRef=useRef<HTMLElement>(null); const mapBadgeRefs=useRef<Array<HTMLButtonElement|null>>([]); const [trail,setTrail]=useState<{width:number;height:number;segments:string[]}>({width:1,height:1,segments:[]});
  useLayoutEffect(()=>{const grid=mapGridRef.current;if(!grid||printMode)return;const measure=()=>{const bounds=grid.getBoundingClientRect();const points=mapBadgeRefs.current.map((button)=>{const badge=button?.querySelector<HTMLElement>(".lmu-badge-icon");if(!badge)return null;const box=badge.getBoundingClientRect();return{x:box.left-bounds.left+box.width/2,y:box.top-bounds.top+box.height/2};}).filter((point):point is {x:number;y:number}=>Boolean(point));if(points.length!==mapSections.length)return;setTrail({width:bounds.width,height:bounds.height,segments:points.slice(0,-1).map((from,index)=>{const to=points[index+1];const direction=Math.sign(to.x-from.x)||1;const fromY=from.y+18;const toY=to.y-18;const bend=Math.min(24,Math.max(12,Math.abs(to.x-from.x)*.2));return`M ${from.x-direction*3} ${fromY} C ${from.x-direction*bend} ${fromY+(toY-fromY)*.42}, ${to.x+direction*bend} ${toY-(toY-fromY)*.42}, ${to.x+direction*3} ${toY}`;})});};measure();const observer=new ResizeObserver(measure);observer.observe(grid);mapBadgeRefs.current.forEach((button)=>button&&observer.observe(button));window.addEventListener("resize",measure);return()=>{observer.disconnect();window.removeEventListener("resize",measure);};},[expanded,mapSections.length,printMode]);
  const stories=response<SuccessStoriesResponse>("success-stories"); const skills=response<TransferableSkillsResponse>("transferable-skills"); const teammates=response<TeammatesResponse>("teammates"); const supervisor=response<SupervisorResponse>("supervisor"); const values=response<ValuesResponse>("values"); const growth=response<GrowthResponse>("growth"); const location=response<LocationResponse>("location"); const xfactor=response<XFactorResponse>("x-factor"); const salary=response<SalaryResponse>("salary");
  const topStories=(stories?.topThreeSelection?.finalStoryIds??[]).flatMap((id)=>{const item=stories?.stories.find((entry)=>entry.id===id);return item?[item]:[];}); const evidence=new Map((skills?.evidence??[]).map((item)=>[item.canonicalKey,item])); const topSkills=(skills?.finalTopFiveSkillIds??[]).flatMap((id)=>{const item=evidence.get(id);return item?[item]:[];});
  const teammateResults=teammates?.finalizedAttributeIds.flatMap((id)=>{const item=teammates.attributes.find((entry)=>entry.id===id);return item?[item]:[];})??[]; const supervisorResults=supervisor?.finalizedAttributeIds.flatMap((id)=>{const item=supervisor.attributes.find((entry)=>entry.id===id);return item?[item]:[];})??[]; const valueResults=values?selectedLMUValues(values):[]; const growthCandidates=growth?resolveGrowthCandidates(growth):[]; const growthResults=growth?.finalTopFiveIds.flatMap((id)=>{const item=growthCandidates.find((entry)=>entry.id===id);return item?[item]:[];})??[];
  const locations=[...(location?.locations??[])].sort((a,b)=>a.order-b.order); const primaryLocation=locations.find((item)=>item.id===location?.primaryLocationId)??locations[0]; const xitems=xfactor?allXFactorItems(xfactor):[]; const xresults=xfactor?.finalTopFour.flatMap((id)=>{const item=xitems.find((entry)=>entry.id===id);return item?[item]:[];})??[]; const money=(amount?:number)=>{if(amount===undefined||!salary)return "Not completed";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:salary.currency,maximumFractionDigits:salary.compensationPeriod==="annual"?0:2}).format(amount);}catch{return `${salary.currency} ${amount}`;}};
  const preview=(id:string)=>id==="success-stories"?topStories.map((item)=>item.title).join(" · "):id==="transferable-skills"?topSkills.map((item)=>item.label).join(" · "):id==="teammates"?teammateResults.slice(0,2).map((item)=>item.positiveAttribute).join(" · "):id==="supervisor"?supervisorResults.slice(0,2).map((item)=>item.positiveAttribute).join(" · "):id==="values"?valueResults.map((item)=>item.displayLabel).join(" · "):id==="growth"?growthResults.slice(0,3).map((item)=>item.detail||item.displayLabel).join(" · "):id==="location"&&primaryLocation?`${location?.relocationOpenness==="stay"?"Home":"First choice"}: ${primaryLocation.label}`:id==="x-factor"?xresults.map((item)=>item.label).join(" · "):id==="salary"?`${money(salary?.financialFloor)} → ${money(salary?.fiveYearGoal)}`:"";
  const toggle=(id:string)=>setExpanded((current)=>current.includes(id)?current.filter((item)=>item!==id):[...current,id]);
  const toggleFromMap=(id:string)=>{
    if(!completed.has(id))return;
    if(id==="current-motivator-rankings"){
      document.getElementById("life-map-priority-context")?.focus();
      return;
    }
    const isOpen=expanded.includes(id);
    toggle(id);
    if(!isOpen)requestAnimationFrame(()=>document.getElementById(`life-map-row-${id}`)?.focus());
  };
  const detail=(id:string)=>{
    if(id==="success-stories")return <section><p className="eyebrow">Top 3 Success Stories</p><ol>{topStories.map((story)=>{const open=printMode||expandedStories.includes(story.id);return <li key={story.id}><strong>{story.title}</strong>{!printMode&&<button type="button" aria-expanded={open} onClick={()=>setExpandedStories((current)=>current.includes(story.id)?current.filter((item)=>item!==story.id):[...current,story.id])}>{open?"− Hide Story":"+ View Story"}</button>}{open&&<div><span>What happened?</span><p>{story.story}</p></div>}</li>;})}</ol></section>;
    if(id==="transferable-skills")return <section><p className="eyebrow">Top 5 Transferable Skills</p><ol>{topSkills.map((item)=>{const category=transferableSkillCategories.find((entry)=>entry.id===item.categoryIds[0]);const definition=allTransferableSkills.find((entry)=>item.sourceSkillIds.includes(entry.id));return <li key={item.canonicalKey}>{category&&<LMUBadgeIcon name={category.iconKey} state="active" size={34} label={category.title}/>}<div><strong>{item.label}</strong>{definition?.briefDescription&&<p>{definition.briefDescription}</p>}<small>Seen in {item.storyCount} of 3 stories</small></div></li>;})}</ol></section>;
    if(id==="teammates"||id==="supervisor"){const items=id==="teammates"?teammateResults:supervisorResults;return <section><p className="eyebrow">{id==="teammates"?"What I Desire in Teammates":"What I Desire in a Supervisor"}</p><ol>{items.map((item)=><li key={item.id}><strong>{item.positiveAttribute}</strong><small>Derived from: {item.sourcePainPointLabel}</small>{item.description&&<p>{item.description}</p>}</li>)}</ol></section>;}
    if(id==="values")return <section>{values?.pathwayUValues.length?<><p className="eyebrow">From PathwayU</p><ul>{values.pathwayUValues.map((item)=><li key={item.id}>{item.label}</li>)}</ul></>:null}<p className="eyebrow">Selected in Life Mapping U</p><ol>{valueResults.map((item,index)=><li key={item.id}>{index+1}. {item.displayLabel}</li>)}</ol></section>;
    if(id==="growth")return <section><p className="eyebrow">Top 5 Growth Priorities</p><ol>{growthResults.map((item,index)=>{const primary=item.detail||item.displayLabel;const distinctSource=item.detail&&item.detail.trim().toLocaleLowerCase()!==item.displayLabel.trim().toLocaleLowerCase();const edge=growth?.growthEdges?.[item.id];return <li key={item.id}><strong>{index+1}. {primary}</strong>{distinctSource&&<small>{item.displayLabel}</small>}{edge?.level&&<small>Growth Edge · {growthEdgeLabels[edge.level]}</small>}{edge?.why&&<p>{edge.why}</p>}</li>;})}</ol></section>;
    if(id==="location")return <section><p className="eyebrow">{location?.relocationOpenness==="stay"?"Home":"Location Path"}</p><p><strong>Relocation:</strong> {relocationLabel(location?.relocationOpenness)}</p>{location?.stayReason&&<p><strong>Why staying matters:</strong> {location.stayReason}</p>}{locations.map((item)=><article key={item.id}><strong>{item.id===primaryLocation?.id?(location?.relocationOpenness==="stay"?"Home":"First Choice"):"Also Considered"}: {item.label}</strong>{item.prioritizedReasons.length>0&&<ol>{item.prioritizedReasons.map((reason)=><li key={reason.id}>{reason.customLabel||reason.label}</li>)}</ol>}</article>)}</section>;
    if(id==="x-factor")return <section><p className="eyebrow">Top 4 X-Factors</p><ol>{xresults.map((item,index)=><li key={item.id}><strong>{index+1}. {item.label}</strong><small>{xFactorQuestionById.get(item.questionId)?.title}</small></li>)}</ol></section>;
    if(id==="salary") { const perspective=compensationPerspective(salary?.tradeoffScenarios??[]); return <section><p className="eyebrow">Salary Range</p>{salary?.financialFloor&&salary.fiveYearGoal?<><SalaryRangeMeter compact floor={salary.financialFloor} goal={salary.fiveYearGoal} currency={salary.currency} period={salary.compensationPeriod}/>{salary.tradeoffVersion&&<><p className="eyebrow">Compensation Perspective</p><p>{perspective.summary}</p>{salary.compensationReflection&&<blockquote>{salary.compensationReflection}</blockquote>}</>}{salary.futureFactors.length>0&&<><p className="eyebrow">Future Financial Realities</p><ul>{salary.futureFactors.map((item)=><li key={item.id}>{item.customLabel||item.type}{item.note?` · ${item.note}`:""}</li>)}</ul></>}</>:<p>Not completed yet.</p>}</section>; }
  };
  const pdfSections: LifeMapPdfSection[] = mapSections.map((item) => {
    const isFoundation=item.moduleId==="success-stories"; const priority=isFoundation?undefined:(item as OrderedLifeMapPriority).priorityRank; const base = { id:item.moduleId, number:isFoundation?undefined:(item as OrderedLifeMapPriority).rowNumber, title:item.title, rankLabel:isFoundation?"Foundation":priority?`Priority ${priority}`:"Discovery Order", preview:preview(item.moduleId) };
    if(item.moduleId==="success-stories") return {...base,heading:"Top 3 Success Stories",items:topStories.map((story)=>({primary:story.title,secondary:"What happened?",body:story.story}))};
    if(item.moduleId==="transferable-skills") return {...base,heading:"Top 5 Transferable Skills",items:topSkills.map((entry,index)=>({primary:`${index+1}. ${entry.label}`,secondary:`Seen in ${entry.storyCount} of 3 stories`,body:allTransferableSkills.find((skill)=>entry.sourceSkillIds.includes(skill.id))?.briefDescription}))};
    if(item.moduleId==="teammates"||item.moduleId==="supervisor"){const entries=item.moduleId==="teammates"?teammateResults:supervisorResults;return {...base,heading:item.moduleId==="teammates"?"What I Desire in Teammates":"What I Desire in a Supervisor",items:entries.map((entry)=>({primary:entry.positiveAttribute,secondary:`Derived from: ${entry.sourcePainPointLabel}`,body:entry.description}))};}
    if(item.moduleId==="values") return {...base,heading:"Selected Values",items:[...(values?.pathwayUValues??[]).map((entry)=>({primary:entry.label,secondary:"From PathwayU"})),...valueResults.map((entry,index)=>({primary:`${index+1}. ${entry.displayLabel}`,secondary:"Selected in Life Mapping U"}))]};
    if(item.moduleId==="growth") return {...base,heading:"Top 5 Growth Priorities",items:growthResults.map((entry,index)=>{const edge=growth?.growthEdges?.[entry.id];const source=entry.detail&&entry.detail.trim().toLowerCase()!==entry.displayLabel.trim().toLowerCase()?entry.displayLabel:undefined;return {primary:`${index+1}. ${entry.detail||entry.displayLabel}`,secondary:[source,edge?.level?`Growth Edge · ${growthEdgeLabels[edge.level]}`:undefined].filter(Boolean).join(" · ")||undefined,body:edge?.why};})};
    if(item.moduleId==="location") return {...base,heading:location?.relocationOpenness==="stay"?"Home":"Location Path",items:locations.map((entry)=>({primary:`${entry.id===primaryLocation?.id?(location?.relocationOpenness==="stay"?"Home":"First Choice"):"Also Considered"}: ${entry.label}`,secondary:entry.prioritizedReasons.map((reason)=>reason.customLabel||reason.label).join(" · ")||undefined,body:entry.id===primaryLocation?.id?location?.stayReason:undefined}))};
    if(item.moduleId==="x-factor") return {...base,heading:"Top 4 X-Factors",items:xresults.map((entry,index)=>({primary:`${index+1}. ${entry.label}`,secondary:xFactorQuestionById.get(entry.questionId)?.title}))};
    const salaryPerspective=compensationPerspective(salary?.tradeoffScenarios??[]); return {...base,heading:"Salary Range & Compensation Perspective",items:[{primary:`Financial Floor: ${money(salary?.financialFloor)}`},{primary:`5-Year Goal: ${money(salary?.fiveYearGoal)}`},...(salary?.tradeoffVersion?[{primary:"Compensation Perspective",body:salaryPerspective.summary},...(salary.compensationReflection?[{primary:"What I Want to Remember",body:salary.compensationReflection}]:[])]:[]),...(salary?.futureFactors??[]).map((entry)=>({primary:entry.customLabel||entry.type,body:entry.note}))]};
  });
  if(printMode)return <LMUShell context={module.shortTitle} theme="dark" journeyHref="/experiences/life-mapping-u/original/modules"><LifeMapAssessmentReport foundation={foundation} ordered={ordered} isReady={isReady} preview={preview} detail={detail}/></LMUShell>;
  return <LMUShell context={module.shortTitle} theme="dark" journeyHref="/experiences/life-mapping-u/original/modules"><article className="life-map-report">
    <section className="life-map-synced-grid" ref={mapGridRef}>
      <div className="life-map-synced-map-bg"><MapAccent density="tight" position="center" opacity={.17}/></div>
      <svg aria-hidden="true" className="life-map-synced-trail" viewBox={`0 0 ${trail.width} ${trail.height}`}>
        {trail.segments.map((segment,index)=><path d={segment} key={index}/>)}
      </svg>
      <header className="life-map-synced-map-title">
        <p className="eyebrow">Your Life Map</p><h1>The path you mapped.</h1><span>{completedCount} of {total} modules complete</span>
      </header>
      <header className="life-map-ranked-header" id="life-map-priority-context" tabIndex={-1}>
        <p className="eyebrow eyebrow-rule">The Map You Discovered</p><LMULogo variant="mark"/>
        <h2>{rankingComplete?"Ordered by what matters most now.":"Your discoveries are taking shape."}</h2>
        <p>{rankingComplete?"Success Stories is your foundation. The eight areas that follow reflect your confirmed current priorities.":"Completed areas appear in discovery order until you confirm your Current Motivator Ranking."}</p>
        <SecondaryButton href="/experiences/life-mapping-u/original/modules">Return to your journey</SecondaryButton>
      </header>
      {mapSections.map((item,index)=>{
        const isFoundation=item.moduleId==="success-stories";
        const priority=isFoundation?undefined:(item as OrderedLifeMapPriority).priorityRank;
        const rowNumber=isFoundation?undefined:(item as OrderedLifeMapPriority).rowNumber;
        const open=expanded.includes(item.moduleId);
        const detailId=`life-map-detail-${item.moduleId}`;
        const toggleLabel=`${open?"Hide":"View"} ${item.title} ${isFoundation?"stories":"results"}`;
        return <Fragment key={item.moduleId}>
          <div className={`life-map-synced-waypoint ${isFoundation?"is-foundation":""} lane-${["left","center","right","center","left","center","right","center","left"][index]}`}>
            <button
              className="life-map-synced-waypoint-main"
              ref={(node)=>{mapBadgeRefs.current[index]=node;}}
              disabled={!item.complete}
              type="button"
              aria-expanded={open}
              aria-controls={detailId}
              aria-label={toggleLabel}
              onClick={()=>toggleFromMap(item.moduleId)}
            >
              <span>{isFoundation?"Foundation":String(rowNumber).padStart(2,"0")}</span>
              <LMUBadgeIcon name={badges[item.moduleId]} state={item.complete?"current":"light"} context="dark" size={44} label={item.title}/>
              <strong>{item.title}</strong>
            </button>
            <button className="life-map-synced-toggle" type="button" disabled={!item.complete} aria-expanded={open} aria-controls={detailId} aria-label={toggleLabel} onClick={()=>toggleFromMap(item.moduleId)}>{open?"−":"+"}</button>
          </div>
          <article className={`life-map-synced-result ${isFoundation?"is-foundation ":""}${item.complete?"is-complete":"is-incomplete"}${open?" is-open":""}`} id={`life-map-row-${item.moduleId}`} tabIndex={-1}>
            <div className="life-map-ranked-row">
              <span>{isFoundation?"Foundation":String(rowNumber).padStart(2,"0")}</span>
              <button className="life-map-ranked-icon-toggle" type="button" disabled={!item.complete} aria-expanded={open} aria-controls={detailId} aria-label={toggleLabel} onClick={()=>toggle(item.moduleId)}>
                <LMUBadgeIcon name={badges[item.moduleId]} state={item.complete?"active":"light"} size={46} label={item.title}/>
              </button>
              <div><h3>{item.title}</h3><small>{isFoundation?"Foundation — Success Stories":priority?`Priority ${priority}`:"Discovery Order"}</small><p>{item.complete?(preview(item.moduleId)||"Results complete"):"Not completed yet"}</p></div>
              <button type="button" disabled={!item.complete} aria-expanded={open} aria-controls={detailId} onClick={()=>toggle(item.moduleId)}>{open?"− Hide My Results":isFoundation?"+ View My Stories":"+ View My Results"}</button>
            </div>
            {open&&item.complete&&<div className="life-map-ranked-detail" id={detailId}>{detail(item.moduleId)}</div>}
          </article>
        </Fragment>;
      })}
    </section>
    <section className={`life-map-download ${isReady?"is-ready":"is-incomplete"}`}><p className="eyebrow">Your Personal Artifact</p><h2>{isReady?"Download My Life Map":"Life Map in Progress"}</h2><p>{isReady?"Download your polished assessment report in your final priority order.":`Complete all 10 modules to enable your final downloadable Life Map. You have completed ${completedCount} of ${total}.`}</p><LifeMapPdfDownload enabled={isReady} sections={pdfSections}/></section>
    <section className="life-map-resources"><p className="eyebrow">What Comes Next</p><h2>Your map is a foundation.</h2><p>Future resources will help you verify, express, and act on these discoveries.</p>{postExperienceResources.map((item)=><div key={item.id}><h3>{item.title}</h3><span>Planned {item.format} resource</span></div>)}</section><div className="life-map-reset"><ModuleStartOverControl experienceId={LMU_ORIGINAL_EXPERIENCE_ID} moduleHref="/experiences/life-mapping-u/module/your-life-map" moduleId="your-life-map"/></div></article></LMUShell>;
}

function LifeMapAssessmentReport({ foundation,ordered,isReady,preview,detail }: { foundation:LifeMapSectionResult;ordered:OrderedLifeMapPriority[];isReady:boolean;preview:(id:string)=>string;detail:(id:string)=>ReactNode }) {
  return <article className="life-map-assessment-report"><LifeMapPrintTrigger enabled={isReady}/><header className="life-map-report-running-header"><LMULogo variant="wordmark-invert"/><span>Assessment Results · Your Life Map</span></header><main><section className="life-map-assessment-summary"><header><p className="eyebrow">Your Life Map</p><h1>Your foundation and current priorities.</h1></header><article className="life-map-assessment-foundation"><LMUBadgeIcon name={badges[foundation.moduleId]} state="active" size={38} label={foundation.title}/><div><small>Foundation</small><h2>{foundation.title}</h2><p>{preview(foundation.moduleId)}</p></div></article><p className="life-map-assessment-priorities-label">Your Priorities</p><ol>{ordered.map((item)=><li key={item.moduleId}><span>{String(item.rowNumber).padStart(2,"0")}</span><LMUBadgeIcon name={badges[item.moduleId]} state="active" size={38} label={item.title}/><div><h2>{item.title}</h2><small>{item.priorityRank?`Priority ${item.priorityRank}`:"Discovery Order"}</small><p>{preview(item.moduleId)}</p></div></li>)}</ol></section><section className="life-map-assessment-details"><article className="is-success-stories is-foundation"><header><span>Foundation</span><LMUBadgeIcon name={badges[foundation.moduleId]} state="active" size={44} label={foundation.title}/><div><small>Foundation — Success Stories</small><h2>{foundation.title}</h2></div></header><div className="life-map-ranked-detail">{detail(foundation.moduleId)}</div></article>{ordered.map((item)=><article className={`is-${item.moduleId}`} key={item.moduleId}><header><span>{String(item.rowNumber).padStart(2,"0")}</span><LMUBadgeIcon name={badges[item.moduleId]} state="active" size={44} label={item.title}/><div><small>{item.priorityRank?`Priority ${item.priorityRank}`:"Discovery Order"}</small><h2>{item.title}</h2></div></header><div className="life-map-ranked-detail">{detail(item.moduleId)}</div></article>)}</section></main><footer className="life-map-report-running-footer"><span>Life Mapping U</span><span className="life-map-page-number">Page</span><Image alt="Wayfinders - Activate Your Purpose" height={33} src="/brand/wayfinders/Wayfinders_Logo_SecondaryFull_Black.svg" width={104}/></footer></article>;
}
