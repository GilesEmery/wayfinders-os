// Local-only owner-review launcher. Reuses the repository's prototype components
// in a temporary Next app without platform AuthProvider, middleware or .env files.
import {mkdtemp,mkdir,readFile,readdir,copyFile,symlink,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const scratch=await mkdtemp(join(tmpdir(),'purposeos-codex3-'));
const port=process.env.CODEX3_PORT||'32013';
if(!/^\d{4,5}$/.test(port))throw Error('Choose a local port number.');
for(const entry of ['components','lib','node_modules'])await symlink(join(repo,entry),join(scratch,entry),'dir');
await mkdir(join(scratch,'app/dev/course-builder-prototype'),{recursive:true});
await symlink(join(repo,'app/dev/course-builder-prototype/page.tsx'),join(scratch,'app/dev/course-builder-prototype/page.tsx'));
if(process.env.CODEX3_REVIEW==='1'){await mkdir(join(scratch,'app/dev/hub-leader-builder'),{recursive:true});await symlink(join(repo,'app/dev/hub-leader-builder/page.tsx'),join(scratch,'app/dev/hub-leader-builder/page.tsx'));await symlink(join(repo,'.local'),join(scratch,'.local'),'dir');await mkdir(join(scratch,'public'),{recursive:true});await symlink(join(repo,'.local/course-review/assets'),join(scratch,'public/review-assets'),'dir');}
await symlink(join(repo,'app/globals.css'),join(scratch,'app/globals.css'));
const tsconfig=JSON.parse(await readFile(join(repo,'tsconfig.json'),'utf8'));
await writeFile(join(scratch,'tsconfig.json'),JSON.stringify({...tsconfig,include:['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts','.next/dev/types/**/*.ts']},null,2));
await copyFile(join(repo,'package.json'),join(scratch,'package.json'));
// Reuse already-cached local Geist files; never fetch fonts or remote assets.
await mkdir(join(scratch,'public/demo-fonts'),{recursive:true});
let faces=[];
async function scan(path){let entries;try{entries=await readdir(path,{withFileTypes:true});}catch{return;}for(const entry of entries){const file=join(path,entry.name);if(entry.isDirectory()){if(entry.name!=='media')await scan(file);}else if(entry.name.endsWith('.css')){const css=await readFile(file,'utf8');for(const match of css.matchAll(/@font-face\s*\{[^}]*\}/g)){if(!/font-family:[^;}]*Geist/i.test(match[0]))continue;const assets=[...match[0].matchAll(/(?:\/|\.\/)([\w.-]+\.woff2)/g)].map(m=>m[1]);if(!assets.length)continue;let face=match[0];for(const asset of assets){try{await copyFile(join(repo,'.next/static/media',asset),join(scratch,'public/demo-fonts',asset));face=face.replaceAll(`/_next/static/media/${asset}`,`/demo-fonts/${asset}`).replaceAll(`../media/${asset}`,`/demo-fonts/${asset}`);}catch{face='';}}if(face)faces.push(face.replace(/font-family:[^;]+;/,'font-family:PurposeDemoSans;'));}}}}
await scan(join(repo,'.next/static/css'));await scan(join(repo,'.next/static/chunks'));
await writeFile(join(scratch,'app/demo-fonts.css'),[...new Set(faces)].join('\n'));
await writeFile(join(scratch,'app/layout.tsx'),`import './globals.css';import './demo-fonts.css';import type {CSSProperties} from 'react';export const metadata={title:'PurposeOS · Fictional Creator Demo',robots:{index:false,follow:false}};export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" style={{'--font-sans':'PurposeDemoSans, Arial, sans-serif','--font-editorial':'Georgia, serif'} as CSSProperties}><body>{children}</body></html>;}`);
await writeFile(join(scratch,'next.config.mjs'),`export default {compress:false,devIndicators:false,experimental:{externalDir:true}};`);
const guard=join(scratch,'local-only.cjs');
await writeFile(guard,`function check(value){let host;try{host=new URL(typeof value==='string'||value instanceof URL?value:value.url).hostname}catch{host=value.hostname||value.host}if(!['localhost','127.0.0.1','::1','[::1]'].includes(String(host).replace(/:\\d+$/,'')))throw Error('CODEX 3 local prototype blocked an external service request');}const original=globalThis.fetch;globalThis.fetch=(input,...args)=>{check(input);return original(input,...args)};for(const name of ['node:http','node:https']){const api=require(name);for(const method of ['get','request']){const original=api[method];api[method]=(input,...args)=>{check(input);return original(input,...args)}}}`);
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:`--require=${guard}`};
for(const key of Object.keys(env))if(/SUPABASE|VERCEL|AUTH_TOKEN|API_KEY|ACCESS_TOKEN|SIGNING_SECRET/.test(key))delete env[key];
console.log(`${process.env.CODEX3_REVIEW==='1'?'Current Hub Leader review':'Fictional CODEX 3 demo'}: http://localhost:${port}/dev/${process.env.CODEX3_REVIEW==='1'?'hub-leader-builder':'course-builder-prototype'}\nLocal browser storage only. No platform auth, middleware, credentials or participant data.\nStop with Ctrl+C.`);
const child=spawn(process.execPath,[join(repo,'node_modules/next/dist/bin/next'),'dev',scratch,'--webpack','--hostname','127.0.0.1','--port',port],{cwd:scratch,env,stdio:'inherit'});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;child.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
child.on('exit',async(code)=>{await rm(scratch,{recursive:true,force:true});process.exitCode=code??0;});
