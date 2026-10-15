import {plainRichText} from "@/lib/experiences/builder/rich-text-document";
import {createElement,type CSSProperties,type ReactNode} from 'react';
import {object,universalModel,type UniversalBlock,type UniversalModel,type UniversalResponse} from '@/lib/experiences/builder/universal-block-editor';
import {getBlockDefinition} from '@/lib/experiences/builder/block-registry';
import {safeExternalUrl} from '@/lib/experiences/builder/media-source';
import type {ParticipantResponseContext} from '@/lib/experiences/builder/participant-runtime';
import type {ResolvedAsset} from '@/lib/experiences/builder/resource-assets';
import {BlockPresentation} from './BlockPresentation';
import {ParticipantRichText,ParticipantRichTitle} from './ParticipantRichText';
import {ParticipantMediaBlock} from './ParticipantMediaBlock';
import {ParticipantPdfReader} from './ParticipantPdfReader';
import {PdfResourceCard} from './PdfResourceCard';
import {ParticipantResponseBlock} from './ParticipantResponseBlock';
import {CalloutIcon} from './CalloutBlock';
import {calloutStyle} from '@/lib/experiences/builder/callout-styles';
import {AssessmentLaunchCard,assessmentLaunchLabel} from './AssessmentLaunchCard';
import {EmbeddedAssessmentLauncher} from './EmbeddedAssessmentLauncher';
import type {AssessmentCardData} from './PrebuiltAssessmentBlock';
import {Globe,ExternalLink} from 'lucide-react';
type Route={slug:string;moduleKey:string;lessonKey:string;sectionKey:string;cohortId?:string|null;previewBase?:string};
export function UniversalContentView({block,model:given,response,asset,route,preview=false,requirementsBypassed=false,assessmentCard}:{block:UniversalBlock&{block_key?:string};model?:UniversalModel;response?:ParticipantResponseContext;asset?:ResolvedAsset;route:Route;preview?:boolean;requirementsBypassed?:boolean;assessmentCard?:AssessmentCardData}){
 const nativeDefinition=getBlockDefinition(block.block_type);if(nativeDefinition?.supportsResponse&&(!response||response.definition.response_type!==nativeDefinition.response?.responseType))return block.requirement_level==='optional'?null:<div role="status" className="participant-block-unavailable">Activity unavailable</div>;
 const model=given??universalModel(block,response?.definition as UniversalResponse|undefined),type=block.block_type,c=model.config,o=model.options;
 const linkContext={slug:route.slug,cohortId:route.cohortId,previewBase:route.previewBase};
 const header=model.header.trim()?<span className="participant-rich-text-block universal-title-formatting" style={{fontSize:"inherit",fontFamily:"inherit",lineHeight:"inherit"}}><ParticipantRichTitle text={model.header}/></span>:null;
 const body=model.body.trim()?<ParticipantRichText title="" text={model.body} linkContext={linkContext}/>:null;
 const headerNode=header&&<div className={`course-item-text is-${model.headerStyle}`}>{createElement(model.headerStyle.startsWith('h')?model.headerStyle:'div',{className:'universal-content-heading',style:{fontSize:`var(--course-${model.headerStyle}-size,${({h1:40,h2:28,h3:20,h4:16,h5:15,h6:13,body:16,small:13})[model.headerStyle]}px)`,fontFamily:`var(--course-${model.headerStyle}-family,var(--font-editorial))`}},header)}</div>;
 const bodyNode=body&&<div className={`course-item-text is-${model.bodyStyle}`}>{body}</div>;
 let item:ReactNode=null,ownText=false;
 if(type==='callout'){
  const style=calloutStyle(c.calloutStyle);ownText=true;item=<aside className={`participant-callout-block ${style?`modern-callout is-border-${c.borderStyle??'left'}`:`is-${c.treatment??'info'}`}`} style={{'--callout-color':style?.color??'var(--experience-accent)'} as CSSProperties}>{(c.showIcon!==false||c.showTitle!==false&&header)&&<div className="callout-heading">{style&&c.showIcon!==false&&<CalloutIcon style={style?.id??'insight'}/>} {c.showTitle!==false&&headerNode}</div>}{bodyNode}</aside>;
 }else if(['video','image'].includes(type))item=<ParticipantMediaBlock kind={type as 'video'|'image'} config={{...c,title:'',description:'',suppressAssetText:true,accessibilityTitle:o.accessibilityTitle,alt:o.decorative?'':c.alt,caption:c.caption&&plainRichText(model.caption)===String(c.caption)?'':c.caption}} asset={asset}/>;
 else if(type==='pdf_reader')item=<ParticipantPdfReader asset={asset} config={{...c,title:'',description:'',suppressAssetText:true,displayFilename:o.displayFilename,accessibilityTitle:o.accessibilityTitle}}/>;
 else if(['document','download'].includes(type)){
  const url=asset?.url??safeExternalUrl(c.url);item=url?<PdfResourceCard icon="folder" accessibilityTitle={o.displayFilename.trim()||asset?.originalFilename||asset?.title||o.accessibilityTitle||"Course file"} title={o.showFilename?(o.displayFilename.trim()||asset?.originalFilename||asset?.title||'Course file'):''} metadata={asset?[o.showFileType?asset.mimeType:null,o.showFileSize&&asset.sizeBytes?`${Math.round(asset.sizeBytes/1024)} KB`:null].filter(Boolean).join(' · '):undefined} url={url} downloadUrl={asset?.downloadUrl} allowOpenInNewTab={o.allowOpen} allowDownload={o.allowDownload&&Boolean(asset?.downloadUrl)} openLabel={o.openLabel} downloadLabel={o.downloadLabel}/>:<p role="status">Choose or upload a file.</p>;
 }else if(type==='external_link'){
  ownText=true;const url=safeExternalUrl(c.url);item=url?<div className={`universal-external-link is-${o.linkDisplay}`}><Globe aria-hidden="true"/><div className="universal-external-copy">{headerNode}{bodyNode}</div><a href={url} target={o.newTab?'_blank':undefined} rel={o.newTab?'noopener noreferrer':undefined}>{String(c.linkLabel||'Open')}{o.newTab&&<><ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></>}</a></div>:<p role="status">Enter an HTTPS link.</p>;
 }else if(type==='prebuilt_assessment'){
  ownText=true;const status=assessmentCard?.status??'not_started',label=status==='not_started'&&o.launchLabel?o.launchLabel:assessmentLaunchLabel(status);
  item=<AssessmentLaunchCard title="" description="" richTitle={headerNode} richDescription={bodyNode} eyebrow={assessmentCard?.name||'PurposeOS Assessment'} status={status} action={preview?<button type="button" disabled>{label}</button>:<EmbeddedAssessmentLauncher blockId={block.id} route={route} label={label}/>}/>;
 }else if(response){const kind=getBlockDefinition(type)?.response?.responseKind;if(kind)item=<ParticipantResponseBlock context={response} configuration={c} responseKind={kind} route={{...route,blockKey:block.block_key??block.id}} preview={preview} interactivePreview={preview} showHeader={false} answerRows={o.answerRows} allowFinalizedEditing={requirementsBypassed}/>;}
 const p=object(object(block.settings).textPresentation),effective={...object(block.settings),textPresentation:{...p,header:'',body:'',headerSize:model.headerStyle,bodySize:model.bodyStyle,placement:model.placement,mediaSide:model.mediaSide,appearance:model.appearance,subtitle:model.subtitle,caption:model.caption}};
 return <div className={`universal-content-view ${response?'is-response':''}`} data-width={o.width} data-space-above={o.above} data-space-below={o.below} data-background={o.background} data-corner={o.corner}><BlockPresentation settings={effective} headerNode={ownText?null:headerNode} bodyNode={ownText?null:bodyNode} linkContext={linkContext}>{type==='heading'&&Boolean(c.eyebrow)&&<p>{String(c.eyebrow)}</p>}{item}</BlockPresentation></div>;
}
