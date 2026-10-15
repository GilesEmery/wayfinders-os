import type {AssessmentResultKind} from './assessment-results';
import {activityResponseItems,activityResultItems,readableResponseFields,type ResponseItem} from './platform/response-library-policy';
import {NATIVE_ASSESSMENT_RESULTS} from './assessment-results-policy';
import {combinedBridgeCounts,bridgeTotalLabel,BRIDGES_EXPLANATION,type BridgesData} from './experiences/builder/bridges-barriers';
export type PdfResult={kind:AssessmentResultKind;id:string;name:string;completedAt:string;data:unknown};
export type PdfSection={title:string;items:ResponseItem[]};
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function assessmentPdfSections(result:PdfResult):PdfSection[]{
 if(result.kind==='life-mapping-u')return (result.data as Array<{section_key:string;result_data:unknown}>).map(row=>{
  const envelope=object(row.result_data),value=object(envelope.result??envelope),{summary,rankedItems,highlights,structuredData,...extra}=value;
  const items:ResponseItem[]=[...(typeof summary==='string'&&summary?[{question:'Summary',response:summary}]:[]),...(Array.isArray(rankedItems)&&rankedItems.length?[{question:'Ranked selections',response:rankedItems.map((item,index)=>{const r=object(item);return `${r.rank??index+1}. ${r.label??r.id??'Selection'}`;}).join('\n')}]:[]),...(Array.isArray(highlights)&&highlights.length?[{question:'Highlights',response:highlights.map(String).join('\n')}]:[]),...readableResponseFields(structuredData),...readableResponseFields(extra),...readableResponseFields(envelope.derivedResults,'Supporting results')];
  return {title:row.section_key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),items:items.map(item=>({...item,question:item.question.replace(/([a-z])([A-Z])/g,'$1 $2')}))};
 });
 const key=Object.entries(NATIVE_ASSESSMENT_RESULTS).find(([,v])=>v.kind===result.kind)?.[0]??({'circle-of-influence':'circle_of_influence','personal-impact-statement':'personal_impact_statement','start-something':'start_something','bridges-vs-barriers':'bridges_vs_barriers_assessment'} as Record<string,string>)[result.kind];
 const envelope={finished:{completedAt:result.completedAt,answers:result.data,participantMaterial:result.data}};
 let scores=activityResultItems(key,envelope,'finalized',result.completedAt);
 if(result.kind==='bridges-vs-barriers'){const c=combinedBridgeCounts(result.data as BridgesData);scores=[{question:'Listening overview',response:`Bridges: ${c.bridges} · Barriers: ${c.barriers} · Still discerning: ${c.discerning} · Reflection total: ${bridgeTotalLabel(c.total)}`},{question:'About these totals',response:BRIDGES_EXPLANATION}];}
 return [...(scores.length?[{title:'Results',items:scores}]:[]),{title:'Completed responses',items:activityResponseItems(key,envelope,{},true)}];
}
export function assessmentPdfFilename(name:string,participantName:string,completedAt:string){
 const clean=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'Assessment';
 return `${clean(participantName)}-${clean(name)}-${completedAt.slice(0,10)}.pdf`;
}
