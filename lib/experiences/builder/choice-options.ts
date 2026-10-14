import type {ResponseOption} from './response-registry';
export function moveChoice(options:readonly ResponseOption[],key:string,to:number):ResponseOption[]{
 const next=[...options],from=next.findIndex(o=>o.key===key);if(from<0||to<0||to>=next.length)return next;
 const [option]=next.splice(from,1);next.splice(to,0,option);return next.map((o,sortOrder)=>({...o,sortOrder}));
}
export function insertChoice(options:readonly ResponseOption[],key:string,after?:string,copy?:ResponseOption):ResponseOption[]{
 if(options.some(o=>o.key===key))throw Error('A duplicated option must have a new unique identifier.');
 const next=[...options],index=after?next.findIndex(o=>o.key===after)+1:next.length;
 next.splice(index,0,{key,label:copy?.label??'',description:copy?.description??'',sortOrder:index});
 return next.map((o,sortOrder)=>({...o,sortOrder}));
}
export function removeChoice(options:readonly ResponseOption[],key:string):ResponseOption[]{return options.filter(o=>o.key!==key).map((o,sortOrder)=>({...o,sortOrder}));}
