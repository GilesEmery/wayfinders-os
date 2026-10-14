import 'server-only';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {basename,join} from 'node:path';
export type RehearsalState={syntheticResponses?:Record<string,Record<string,unknown>>;attachments:Record<string,string|null>;blocks:Record<string,Record<string,unknown>>;sections?:Record<string,Record<string,unknown>>;definitions?:Record<string,Record<string,unknown>>;resources:Record<string,unknown>[]};
export function readRehearsalState():RehearsalState{const path=join(process.cwd(),'rehearsal-state.json');return existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{attachments:{},blocks:{},resources:[]};}
export function writeRehearsalState(state:RehearsalState){if(!basename(process.cwd()).startsWith('purposeos-integrated-builder-')||!existsSync(join(process.cwd(),'offline-guard.cjs')))throw Error('Local rehearsal state requires the isolated review application');const path=join(process.cwd(),'rehearsal-state.json');writeFileSync(path+'.tmp',JSON.stringify(state));renameSync(path+'.tmp',path);}
