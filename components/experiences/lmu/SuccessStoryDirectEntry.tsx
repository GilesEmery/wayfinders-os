"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {loadServerAssessment} from '@/lib/experiences/lmu/persistence';
import {hydrateFromServer} from '@/lib/experiences/lmu/storage';
import type {LMUInstructionalMedia} from '@/lib/experiences/lmu/types';
import {SuccessStoriesModule} from './SuccessStoriesModule';

// Restore saved work before mounting an editor that can autosave a draft.
export function SuccessStoryDirectEntry({media}:{media?:Record<string,LMUInstructionalMedia>}){
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'|'error'>('loading');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;void loadServerAssessment().then(assessment=>{if(!active)return;if(!assessment){setStatus('unavailable');return;}hydrateFromServer(assessment);setStatus('ready');}).catch(()=>{if(active)setStatus('error');});return()=>{active=false};},[retry]);
 if(status==='ready')return <SuccessStoriesModule media={media} startInEditor/>;
 return <main className="lmu-account-panel" style={{maxWidth:700,margin:'60px auto',padding:24}}>{status==='loading'?<p role="status">Opening your story entry form…</p>:status==='error'?<><p role="alert">We could not restore your saved stories. Your work has not been reset.</p><button className="button button-primary" onClick={()=>{setStatus('loading');setRetry(v=>v+1)}}>Try again</button></>:<><h1>Sign in to enter your stories</h1><p>Use the email connected to your Life Mapping U account.</p><Link className="button button-primary" href="/experiences/life-mapping-u/original">Open Life Mapping U</Link></>}</main>;
}
