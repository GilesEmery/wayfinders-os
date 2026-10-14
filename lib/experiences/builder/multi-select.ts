/** Shared authoring, learner and server limits. Omitted/null maximum means no cap. */
export function multiSelectLimits(configuration:Record<string,unknown>,available:number,required=false){
 const rawMin=configuration.minSelections??0,rawMax=configuration.maxSelections;
 // Older native configurations accepted numeric strings; keep them readable without a resave.
 const number=(value:unknown)=>typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
 const minimum=number(rawMin);
 const maximum=rawMax===undefined||rawMax===null?null:number(rawMax);
 const errors:string[]=[];
 if(!Number.isInteger(minimum)||minimum<0||minimum>available)errors.push(`Minimum selections must be a whole number between 0 and ${available}.`);
 if(maximum!==null&&(!Number.isInteger(maximum)||maximum<1||maximum>available))errors.push(`Maximum selections must be a whole number between 1 and ${available}, or No maximum.`);
 if(maximum!==null&&minimum>maximum)errors.push('Minimum selections cannot exceed maximum selections.');
 return {minimum:Math.max(Number.isFinite(minimum)?minimum:0,required?1:0),maximum,errors};
}
export function multiSelectInstructions(minimum:number,maximum:number|null){
 if(maximum!==null&&minimum===maximum)return `Select exactly ${minimum}.`;
 if(minimum>0&&maximum!==null)return `Select ${minimum}–${maximum}.`;
 if(minimum>0)return `Select at least ${minimum}.`;
 if(maximum!==null)return `Select up to ${maximum}.`;
 return 'Select all that apply.';
}
export function multiSelectSubmissionErrors(count:number,minimum:number,maximum:number|null,required:boolean){
 if(!required&&count===0)return [];
 const errors:string[]=[];
 if(count<minimum)errors.push(`Select at least ${minimum} option${minimum===1?'':'s'}.`);
 if(maximum!==null&&count>maximum)errors.push(`Select no more than ${maximum} option${maximum===1?'':'s'}.`);
 return errors;
}
