import type { ParticipantModuleProgress } from "@/lib/experiences/lmu/types";
import type { LocationResponse } from "@/modules/lmu/location/types";
import { relocationLabel } from "@/modules/lmu/location/curriculum";
import type { SalaryResponse } from "@/modules/lmu/salary/types";
import { currencyByCode } from "@/lib/currency/currencies";
import type { MotivatorDefinition } from "./curriculum";

export interface MotivatorPreview { complete: boolean; shortPreview: string; expandedGroups: Array<{label?:string;items:string[]}>; salaryRange?: SalaryResponse }
const formatAmount=(amount:number,currency:string)=>{const digits=currencyByCode.get(currency)?.fractionDigits??2;try{return new Intl.NumberFormat(undefined,{style:"currency",currency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(amount);}catch{return `${currency} ${amount}`;}};

export function getMotivatorPreview(definition: MotivatorDefinition, progress: ParticipantModuleProgress[]): MotivatorPreview {
  const source=progress.find((item)=>item.moduleId===definition.sourceModuleId); if(source?.status!=="completed") return {complete:false,shortPreview:"Not completed yet",expandedGroups:[]};
  const ranked=[...(source.result?.rankedItems??[])].sort((a,b)=>a.rank-b.rank).map((item)=>item.label); const highlights=source.result?.highlights??[];
  if(definition.id==="location") { const response=source.responses as unknown as LocationResponse; const ordered=[...(response.locations??[])].sort((a,b)=>a.order-b.order); const active=response.relocationOpenness==="stay"?ordered.slice(0,1):ordered.slice(0,3); const primary=active.find((item)=>item.id===response.primaryLocationId)??active[0]; return {complete:true,shortPreview:primary?`${response.relocationOpenness==="stay"?"Home":"First choice"}: ${primary.label}`:"Location preferences complete",expandedGroups:[{label:"Openness to relocation",items:[relocationLabel(response.relocationOpenness)]},{label:"Location preferences",items:active.map((item)=>item.label)}]}; }
  if(definition.id==="salary") { const response=source.responses as unknown as SalaryResponse; const floor=response.financialFloor; const goal=response.fiveYearGoal; return {complete:true,shortPreview:floor&&goal?`${formatAmount(floor,response.currency)} → ${formatAmount(goal,response.currency)} · ${response.compensationPeriod}`:"Salary range complete",expandedGroups:[],salaryRange:response}; }
  if(definition.id==="values") { const structured=source.result?.structuredData as {pathwayUValues?:Array<{label:string}>;selectedValues?:Array<{displayLabel:string}>}; const lmu=structured?.selectedValues?.map((item)=>item.displayLabel)??ranked; const pathway=structured?.pathwayUValues?.map((item)=>item.label)??[]; return {complete:true,shortPreview:lmu.join(" · "),expandedGroups:[...(pathway.length?[{label:"PathwayU values",items:pathway}]:[]),{label:"Life Mapping U values",items:lmu}]}; }
  const items=ranked.length?ranked:highlights; const previewCount=definition.id==="skills"||definition.id==="x-factor"?5:3;
  return {complete:true,shortPreview:items.slice(0,previewCount).join(" · ")||`${definition.label} results complete`,expandedGroups:[{items}]};
}
