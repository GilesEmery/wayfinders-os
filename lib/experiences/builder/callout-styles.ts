export const CALLOUT_STYLES = [
 {id:'insight',label:'Key Insight',color:'#3478e5'},
 {id:'remember',label:'Remember',color:'#159447'},
 {id:'reflect',label:'Reflect',color:'#9850df'},
 {id:'practice',label:'Put It Into Practice',color:'#b97c08'},
 {id:'important',label:'Important',color:'#dc3039'},
 {id:'scripture',label:'Scripture',color:'#60748e'},
 {id:'prayer',label:'Prayer',color:'#4779a7'},
 {id:'discuss',label:'Discuss Together',color:'#19857e'},
 {id:'next_step',label:'Next Step',color:'#bd5c29'},
] as const;
export type CalloutStyle = typeof CALLOUT_STYLES[number]['id'];
export function calloutStyle(id:unknown){return CALLOUT_STYLES.find(style=>style.id===id);}
