"use client";
import {useEffect,useState} from 'react';
import {Download,FileText} from 'lucide-react';
import type {AssessmentResultSummary} from '@/lib/assessment-results';
export function AssessmentPdfDownloads({participantId}:{participantId:string}){
 const [results,setResults]=useState<AssessmentResultSummary[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[retry,setRetry]=useState(0);
 const endpoint=`/api/admin/wayfinders/${encodeURIComponent(participantId)}/assessment-results`;
 useEffect(()=>{const controller=new AbortController();fetch(endpoint,{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load PDFs.');setResults(data.results);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load PDFs.');});return()=>controller.abort();},[endpoint,retry]);
 async function download(result:AssessmentResultSummary){
  if(busy)return;setBusy(result.id);setError('');
  try{const response=await fetch(`${endpoint}/${encodeURIComponent(result.kind)}/${encodeURIComponent(result.id)}/pdf`,{cache:'no-store'});if(!response.ok){const e=await response.json().catch(()=>({}));throw Error(e.error||'Unable to download PDF.');}if(!response.headers.get('content-type')?.includes('application/pdf'))throw Error('The PDF could not be confirmed. Please retry.');const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]||`${result.name}.pdf`;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
  catch(e){setError(e instanceof Error?e.message:'Unable to download PDF.');}finally{setBusy(null);}
 }
 return <section className="crm-assessment-downloads" aria-label="Completed assessment PDFs"><header><h3>Completed assessment PDFs</h3><p>Download saved results and responses for this Wayfinder.</p></header>{error&&<p role="alert">{error} {!results&&<button type="button" onClick={()=>setRetry(v=>v+1)}>Try again</button>}</p>}{!results&&!error&&<p role="status">Loading assessment PDFs…</p>}{results?.length===0&&<p>No completed assessments are available to download yet.</p>}{results?.map(result=><article key={`${result.kind}-${result.id}`}><FileText size={22} aria-hidden="true"/><div><strong>{result.name}</strong><span>Completed {new Date(result.completedAt).toLocaleDateString('en-US',{timeZone:'UTC'})}</span></div><button type="button" disabled={busy!==null} onClick={()=>void download(result)} aria-label={`Download ${result.name} PDF`}><Download size={16} aria-hidden="true"/>{busy===result.id?'Preparing PDF…':'Download PDF'}</button></article>)}{busy&&<p role="status">Preparing assessment PDF…</p>}</section>;
}
