"use client";
import type {ReactNode} from 'react';
export type AdvancedEditDefinition={type:string;universalFields:readonly string[];advancedCapabilities:readonly string[]};
export const VIDEO_ADVANCED_EDIT={type:'video',universalFields:['header','text','subtext'],advancedCapabilities:['typography','spacing','background','border','width','textColumns','visibility']} as const satisfies AdvancedEditDefinition;
export function UniversalAdvancedEdit({definition,text,specialized,additional,save,textLabel="Text Content",specializedLabel,display,preview}:{textLabel?:string;specializedLabel?:string;display?:ReactNode;preview?:ReactNode;definition:AdvancedEditDefinition;text:ReactNode;specialized:ReactNode;additional:ReactNode;save:ReactNode}){
 return <div className="universal-advanced-edit" data-advanced-edit-type={definition.type}><section>{textLabel&&<h3>{textLabel}</h3>}{text}</section>{specialized&&<section>{specializedLabel!==''&&<h3>{specializedLabel??(definition.type==='video'?'Video Settings':'Content Settings')}</h3>}{specialized}</section>}{display&&<section><h3>Display Options</h3>{display}</section>}<details className="universal-additional-customization"><summary>Additional Customization</summary>{additional}</details>{save}{preview&&<section><h3 className="builder-preview-label">Preview</h3>{preview}</section>}</div>;
}
