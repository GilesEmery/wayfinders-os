// Runs the actual Dashboard and Journey pages in an isolated copy with fictitious data.
// No .env files are copied; authentication, loaders, and DB access are replaced only
// in the temporary copy. The repository's production code remains unchanged.
import { cp, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const directory=await mkdtemp(join(tmpdir(),'purposeos-journey-review-'));
await Promise.all(['app','components','lib','modules','data','public','package.json','next.config.ts','tsconfig.json','postcss.config.mjs'].map(name=>cp(join(root,name),join(directory,name),{recursive:true})));
await symlink(join(root,'node_modules'),join(directory,'node_modules'),'dir');
const now='2026-10-02T12:00:00.000Z';
const slugs=['personal-impact-statement','start-something','regular-course'];
const titles=['Personal Impact Statement','Start Something','Community Practice'];
const experiences=slugs.map((slug,index)=>({id:`x${index}`,slug,name:titles[index],experience_type:index===2?'course':'assessment'}));
const enrollments=experiences.map((item,index)=>({id:`e${index}`,experience_id:item.id,experience_version_id:`v${index}`,status:index===1?'in_progress':'enrolled',updated_at:now,completed_at:null}));
const cards=Object.fromEntries(experiences.map((item,index)=>[`e${index}`,{imageUrl:null,eyebrow:index===2?'Course':'Assessment',headline:item.name,supportingText:index===0?'Put words to the unique difference you want to make.':index===1?'Give your idea a practical direction.':'A safe, fictitious enrolled course.'}]));
const histories=experiences.map((item,index)=>({id:`history${index}`,enrollmentId:`e${index}`,experienceId:item.id,versionId:`old-v${index}`,completedAt:`2026-09-${20-index}T12:00:00.000Z`}));
for(let index=0;index<3;index++)cards[`history${index}`]=cards[`e${index}`];
const lmuCard={imageUrl:'/brand/lmu/maps/map-gray-header.png',eyebrow:'Assessment',headline:'Life Mapping U',supportingText:'Understand your story, strengths, values, and direction.'};
const data={user:{id:'fixture-user',email:'fixture@example.test'},participant:{id:'fixture-person',first_name:'Maya',full_name:'Maya Fixture'},lmuAssessments:[{id:'fixture-lmu-active',status:'in_progress',current_module:'values',updated_at:now},{id:'fixture-lmu-complete',status:'completed',completed_at:'2026-09-15T12:00:00.000Z',updated_at:'2026-09-15T12:00:00.000Z'}],lmuSectionProgress:[],enrollments,progress:[{enrollment_id:"e2",status:"in_progress",started_at:now,updated_at:"2026-10-02T13:00:00.000Z"}],experiences,trainingCards:cards,completionRecords:histories,lmuCard,cohortMemberships:[{cohort_id:'c1',membership_role:'participant',status:'active'},{cohort_id:'c2',membership_role:'participant',status:'active'}],cohorts:[{id:'c1',name:'Tuesday Circle',experience_id:'x2',status:'active'},{id:'c2',name:'Saturday Circle',experience_id:'x2',status:'active'}],cohortOfferings:[{cohort_id:'c1',experience_id:'x2',experience_version_id:'v2',status:'active'},{cohort_id:'c2',experience_id:'x2',experience_version_id:'v2',status:'active'}],organizationMemberships:[],organizations:[],hubMemberships:[],hubs:[],hubMemberCatalog:[],defaultHubId:null,participantTags:[],tags:[],roles:[],capabilities:{},networkOverview:null};
const results=[{kind:'personal-impact-statement',id:'fixture-pis-result',name:titles[0],enrollmentId:'e0',versionId:'old-v0',completedAt:histories[0].completedAt},{kind:'start-something',id:'fixture-start-result',name:titles[1],enrollmentId:'e1',versionId:'old-v1',completedAt:histories[1].completedAt},{kind:'life-mapping-u',id:'fixture-lmu-complete',name:'Life Mapping U',completedAt:'2026-09-15T12:00:00.000Z'}];
await Promise.all([
 writeFile(join(directory,'lib/platform/dashboard.ts'),`import {headers} from "next/headers"; export async function getWayfinderDashboard(){const data=${JSON.stringify(data)};const count=(await headers()).get("x-fixture-count");if(count!==null){const n=Number(count);data.lmuAssessments=data.lmuAssessments.filter(item=>item.status!=="in_progress");data.enrollments=data.enrollments.slice(0,n);if(n===0){data.completionRecords=[];data.cohortMemberships=[];data.lmuAssessments=[];}}return data;}`),
 writeFile(join(directory,'lib/assessment-results.ts'),`import {headers} from "next/headers";export async function listCompletedAssessmentResults(){return (await headers()).get("x-fixture-count")==="0"?[]:${JSON.stringify(results)};}`),
 writeFile(join(directory,'app/layout.tsx'),`import './globals.css';import {WayfindersAuthProvider} from '@/components/platform/WayfindersAuthProvider';export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><WayfindersAuthProvider initialAccount={{email:'fixture@example.test',fullName:'Maya Fixture',displayName:'Maya',isAdmin:false,adminRole:null}}>{children}</WayfindersAuthProvider></body></html>}`),
 writeFile(join(directory,'lib/supabase/client.ts'),`export function createBrowserSupabaseClient(){throw new Error('Database is disabled in safe visual fixtures.');}`),
]);
// Other routes compile lazily; their imported server modules are never reached.
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|VERCEL|EXPERIENCE_ACCESS/.test(key))delete env[key];
console.log(`Safe visual fixture: http://127.0.0.1:4327/dashboard and /my-journey\nTemporary copy: ${directory}\nUse Ctrl-C to stop. No real database connections are configured.`);
const child=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','-H','127.0.0.1','-p','4327'],{cwd:directory,env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
