"use client";
import type {JSONContent} from '@tiptap/core';
import {DemoRichText} from './RichText';
import {useState} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type {BuilderContentBlock} from '@/lib/experiences/builder/types';
import {ParticipantRichText} from '@/components/experiences/builder/ParticipantRichText';
import {readBlockPresentation} from '@/lib/experiences/builder/block-presentation';
import {useCourseReview} from './ReviewContext';
import styles from './Prototype.module.css';
import typography from './Typography.module.css';
const Ethos=dynamic(()=>import('@/components/experiences/builder/EthosAssessment').then(m=>m.EthosAssessment));
const Activate=dynamic(()=>import('@/components/experiences/builder/ActivatePurposeAssessment').then(m=>m.ActivatePurposeAssessment));
const Hub=dynamic(()=>import('@/components/experiences/builder/LaunchingWayfindersHubAssessment').then(m=>m.LaunchingWayfindersHubAssessment));
const Impact=dynamic(()=>import('@/components/experiences/builder/PersonalImpactStatementAssessment').then(m=>m.PersonalImpactStatementAssessment));
const Circle=dynamic(()=>import('@/components/experiences/builder/CircleOfInfluenceAssessment').then(m=>m.CircleOfInfluenceAssessment));
const Start=dynamic(()=>import('@/components/experiences/builder/StartSomethingExperience').then(m=>m.StartSomethingExperience));
const route={slug:'__local_review__',moduleKey:'local',lessonKey:'local',sectionKey:'local',blockKey:'local',cohortId:null};
const text=(value:unknown)=>typeof value==='string'?value:'';
export function ReviewBlock({block}:{block:BuilderContentBlock}) {
 const review=useCourseReview(),[open,setOpen]=useState(false),config=block.configuration;
 const typed=block as BuilderContentBlock&{reviewAsset?:string;reviewDefinition?:Record<string,unknown>};
 const presentation=readBlockPresentation(block.settings);
 let body;
 if(block.block_type==='rich_text')body=<ParticipantRichText title={text(config.title)} titleLevel={text(config.titleLevel)||'h3'} text={text(config.text)}/>;
 else if(block.block_type==='heading')body=<ParticipantRichText title={text(config.text)||text(config.title)} titleLevel={text(config.level)} text=""/>;
 else if(block.block_type==='callout')body=<div className={styles.callout}><ParticipantRichText title={text(config.title)} text={text(config.body)}/></div>;
 else if(block.block_type==='structured_response'||block.block_type==='checklist')body=<ReviewQuestion block={typed}/>;
 else if(block.block_type==='image')body=<figure>{config.title&&<h4>{text(config.title)}</h4>}{typed.reviewAsset?<Image src={typed.reviewAsset} alt={text(config.alt)} width={1200} height={800} unoptimized style={{width:'100%',height:'auto'}}/>:<p>Source image reference preserved; local image unavailable.</p>}{config.description&&<ParticipantRichText title="" text={text(config.description)}/>}<figcaption>{text(config.caption)}</figcaption></figure>;
 else if(block.block_type==='pdf_reader'||block.block_type==='document'||block.block_type==='download')body=<div><h4>{text(config.title)||'Course reading'}</h4><ParticipantRichText title="" text={text(config.description)}/>{typed.reviewAsset?<><a href={typed.reviewAsset} target="_blank" rel="noopener noreferrer">Open local {block.block_type==='pdf_reader'?'PDF':'resource'}</a>{config.allowDownload!==false&&<a style={{marginLeft:16}} href={typed.reviewAsset} download>Download local copy</a>}{block.block_type==='pdf_reader'&&config.showReader!==false&&<iframe title={text(config.title)||'Local course PDF'} src={typed.reviewAsset} style={{width:'100%',height:600,border:'1px solid #d3dfca',marginTop:16}}/>}</>:<p>External resource reference retained in Edit; no remote resource is fetched automatically.</p>}</div>;
 else if(block.block_type==='video'||block.block_type==='external_link')body=<div><h4>{text(config.title)|| (block.block_type==='video'?'Course video':'External resource')}</h4><ParticipantRichText title="" text={text(config.description)}/><p>Original source is retained in Edit. External playback/navigation stays disabled in this offline course review.</p><small>{text(config.caption)}</small></div>;
 else if(block.block_type==='prebuilt_assessment'){
  const assessment=review?.assessments.find(a=>a.id===config.assessmentExperienceId),renderer=assessment?.blocks?.[0]?.custom_renderer_key;
  body=<div><h4>{text(config.title)||assessment?.name||'Assessment'}</h4><ParticipantRichText title="" text={text(config.description)||assessment?.description||''}/><button type="button" onClick={()=>setOpen(!open)}>{open?'Close assessment preview':'Preview assessment locally'}</button>{open&&<div>{renderer==='wayfinders-ethos-assessment.v1'?<Ethos initialData={null} route={route} returnTo="/dev/hub-leader-builder" preview autoStart/>:renderer==='activate-your-purpose-assessment.v1'?<Activate initialData={null} route={route} returnTo="/dev/hub-leader-builder" preview autoStart/>:renderer==='launching-wayfinders-hub-assessment.v1'?<Hub initialData={null} route={route} returnTo="/dev/hub-leader-builder" preview autoStart/>:renderer==='personal-impact-statement.v1'?<Impact initialData={null} route={route} returnTo="/dev/hub-leader-builder" preview/>:renderer==='circle-of-influence.v1'?<Circle initialData={null} route={route} returnTo="/dev/hub-leader-builder" preview autoStart/>:renderer==='start-something.v1'?<Start initialData={null} route={route} returnTo="/dev/hub-leader-builder" preview/>:<p>This legacy attached program has no published native curriculum to copy. Its connection is retained without launching the live program.</p>}</div>}<small style={{display:'block'}}>Local preview only · no participant responses or saves</small></div>;
 }else body=<p>Custom source is preserved in Edit → Source. Its external integration is inactive in this local review.</p>;
 const extra=presentation?<div><ParticipantRichText title={presentation.header} titleLevel={presentation.headerSize} text={presentation.body}/></div>:null;
 return <div className={typography.root} data-review-block-type={block.block_type}>{presentation?.placement==='above'&&extra}{body}{presentation?.placement!=='above'&&extra}</div>;
}
function ReviewQuestion({block}:{block:BuilderContentBlock&{reviewDefinition?:Record<string,unknown>}}){
 const [answer,setAnswer]=useState(''),[choices,setChoices]=useState<string[]>([]),definition=block.reviewDefinition??{},config={...((definition.configuration??{}) as Record<string,unknown>),...block.configuration},options=(config.options??config.choices??[]) as {label?:string;value?:string}[];
 return <div><ReviewField block={block} field="prompt" fallback={text(definition.label)||"Course reflection"} heading/><ReviewField block={block} field="instructions" fallback={text(definition.instructions)}/>{Array.isArray(options)&&options.length?options.map((option,index)=>{const value=typeof option==='string'?option:String(option.value??index),label=typeof option==='string'?option:String(option.label??value);return <label key={value} style={{display:'block',padding:8}}><input type="checkbox" checked={choices.includes(value)} onChange={event=>setChoices(event.target.checked?[...choices,value]:choices.filter(v=>v!==value))}/> {label}</label>}):<textarea aria-label={text(definition.label)||'Local review response'} value={answer} onChange={event=>setAnswer(event.target.value)} placeholder={text(config.placeholder)} rows={4} style={{width:'100%'}}/>}<small>Review response stays in memory. Nothing is submitted.</small></div>;
}

function ReviewField({block,field,fallback,heading=false}:{block:BuilderContentBlock;field:string;fallback:string;heading?:boolean}){const document=(block.configuration.demoTextFields as Record<string,unknown>|undefined)?.[field] as JSONContent|undefined;const value=typeof block.configuration[field]==='string'?String(block.configuration[field]):fallback;return document?<DemoRichText document={document}/>:<ParticipantRichText title={heading?value:''} titleLevel="h4" text={heading?'':value}/>;}
