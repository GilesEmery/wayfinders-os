// Builds and tests an isolated copy against a read-only, in-memory Supabase fixture.
// Does not load .env.local, connect to real Supabase, or write participant data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID, scryptSync } from 'node:crypto';
import { cp, mkdtemp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = await mkdtemp(join(tmpdir(), 'purposeos-password-review-'));
const fixtureAdminKey = 'purposeos-test-only-admin-key-not-a-credential';
const fixturePublicKey = 'purposeos-test-only-public-key-not-a-credential';
const fixtureSecret = 'fixture-only-signing-secret-never-production-123456789';
function listen(server) { return new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', () => yes(server.address().port)); }); }
function run(args, options) { return new Promise((yes, no) => { const child = spawn(process.execPath, args, options); child.once('error', no); child.once('exit', code => code === 0 ? yes() : no(new Error(`Fixture command exited ${code}`))); }); }
const id='24fd0477-2a16-4ca1-98bb-c090931895c3';
const salt='a'.repeat(32);
const password_hash=`scrypt$131072$8$1$${salt}$${scryptSync('fixture password',Buffer.from(salt,'hex'),64,{N:131072,r:8,p:1,maxmem:268435456}).toString('hex')}`;
let revision=randomUUID(), protectedMode=true, writes=0;
const backendServer = createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost:4319');
  res.setHeader('content-type','application/json');
  if(url.pathname==='/__fixture/state') return res.end(JSON.stringify({revision,protectedMode,writes}));
  if(url.pathname==='/__fixture/change') {revision=randomUUID();return res.end('{}');}
  if(url.pathname==='/__fixture/remove') {protectedMode=false;return res.end('{}');}
  if(url.pathname==='/__fixture/recreate') {protectedMode=true;revision=randomUUID();return res.end('{}');}
  if(req.method!=='GET') {writes++;res.statusCode=403;return res.end(JSON.stringify({error:'Fixture is read-only'}));}
  let rows=[];
  if(url.pathname==='/rest/v1/experiences') rows=[{id,slug:'life-mapping-u',name:'Password QA Fixture',status:'active',experience_type:'assessment',delivery_mode:'custom_code',accent_color:'#349fd5'}];
  if(url.pathname==='/rest/v1/experience_password_credentials'&&protectedMode) rows=[{experience_id:id,password_hash,credential_revision:revision}];
  if (url.pathname.startsWith('/rest/v1/') && req.headers.apikey !== fixtureAdminKey) { res.statusCode=401; return res.end(JSON.stringify({ error: 'Expected the non-secret fixture admin key' })); }
  if (url.pathname.startsWith('/auth/') && ![fixtureAdminKey, fixturePublicKey].includes(req.headers.apikey)) { res.statusCode=401; return res.end(JSON.stringify({ error: 'Expected a non-secret fixture key' })); }
  if(url.pathname.startsWith('/auth/')) {res.statusCode=401;return res.end(JSON.stringify({message:'No fixture session',code:'session_not_found'}));}
  for(const [key,val] of url.searchParams) if(val.startsWith('eq.')) rows=rows.filter(row=>String(row[key])===val.slice(3));
  const select=url.searchParams.get('select');
  if(select&&select!=='*') rows=rows.map(row=>Object.fromEntries(select.split(',').map(key=>[key,row[key]])));
  res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object') ? rows[0]??null : rows));
});

let application;
try {
  const backendPort = await listen(backendServer);
  const backend = `http://127.0.0.1:${backendPort}`;
  for (const name of ['app', 'components', 'lib', 'modules', 'data', 'public']) await cp(join(root, name), join(fixtureDirectory, name), { recursive: true });
  for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'proxy.ts']) await cp(join(root, name), join(fixtureDirectory, name));
  await symlink(join(root, 'node_modules'), join(fixtureDirectory, 'node_modules'), 'dir');
  const env = { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: backend, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fixturePublicKey, SUPABASE_SECRET_KEY: fixtureAdminKey, EXPERIENCE_ACCESS_SIGNING_SECRET: fixtureSecret };
  const cli = join(root, 'node_modules/next/dist/bin/next');
  console.log(`Building isolated review fixture in ${fixtureDirectory}`);
  await run([cli, 'build', '--webpack'], { cwd: fixtureDirectory, env, stdio: 'inherit' });
  const portProbe = createServer();
  const applicationPort = await listen(portProbe);
  await new Promise(yes => portProbe.close(yes));
  const base = `http://127.0.0.1:${applicationPort}`;
  application = spawn(process.execPath, [cli, 'start', '-p', String(applicationPort), '-H', '127.0.0.1'], { cwd: fixtureDirectory, env, stdio: 'inherit' });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await fetch(backend + '/__fixture/state'); await fetch(base + '/experience-access/life-mapping-u'); ready = true; break; } catch { await new Promise(yes => setTimeout(yes, 100)); }
  }
  assert.ok(ready, 'Fixture application failed to start');
const baseline=await(await fetch(backend+'/__fixture/state')).json();
const path='/experiences/life-mapping-u/original?returnTo=%2Fexperiences%2Ffixture-course';
async function get(path,cookie='') {return fetch(base+path,{headers:cookie?{cookie}:{},redirect:'manual'});}
const deep=await get(path);assert.equal(deep.status,303);
const gatePath=new URL(deep.headers.get('location'),base).pathname+new URL(deep.headers.get('location'),base).search;
const html=await(await get(gatePath)).text();
assert.ok(html.includes('Password QA Fixture'));assert.ok(!html.includes('password_hash'));assert.ok(!html.includes('scrypt$131072'));
const formMarkup=html.match(/<form[^>]*action=""[^>]*>([\s\S]*?)<\/form>/)?.[1] ?? html.match(/<form[^>]*>([\s\S]*?)<\/form>/)?.[1];
assert.ok(formMarkup,'Password form missing');
function decode(value) {return value.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&');}
function form(password) {
 const data=new FormData();
 for(const tag of formMarkup.matchAll(/<input[^>]*>/g)) {
  const name=tag[0].match(/name="([^"]*)"/)?.[1];const value=tag[0].match(/value="([^"]*)"/)?.[1]??'';
  if(name?.startsWith('$ACTION'))data.append(decode(name),decode(value));
 }
 data.append('password',password);return data;
}
const incorrect=await fetch(base+gatePath,{method:'POST',body:form('incorrect fixture password'),headers:{origin:base},redirect:'manual'});
assert.equal(incorrect.status,303);assert.ok(incorrect.headers.get('location').includes('error=incorrect'));assert.equal(incorrect.headers.get('set-cookie'),null);
const correct=await fetch(base+gatePath,{method:'POST',body:form('fixture password'),headers:{origin:base},redirect:'manual'});
assert.equal(correct.status,303);
const setCookie=correct.headers.get('set-cookie');assert.ok(setCookie?.includes('HttpOnly'));assert.ok(setCookie.includes('Secure'));assert.ok(setCookie.includes('SameSite=lax'));assert.ok(setCookie.includes('Max-Age=604800'));
const cookie=setCookie.split(';')[0];
assert.equal(new URL(correct.headers.get('location'),base).pathname,'/experiences/life-mapping-u/original');
assert.equal((await get(path,cookie)).status,200);
const api=await get('/api/lmu/assessment');assert.equal(api.status,403);assert.equal((await api.json()).code,'experience_password_required');
await fetch(backend+'/__fixture/change');assert.equal((await get(path,cookie)).status,303);
await fetch(backend+'/__fixture/remove');assert.equal((await get(path,cookie)).status,200);
await fetch(backend+'/__fixture/recreate');assert.equal((await get(path,cookie)).status,303);
const state=await(await fetch(backend+'/__fixture/state')).json();assert.equal(state.writes,baseline.writes);
console.log('PASS: actual Next HTTP deep link, branded page, wrong/correct server action, HttpOnly/Secure/expiry cookie, resume context, API 403, revision revocation, remove/recreate, and zero fixture backend writes.');

} finally {
  if (application && application.exitCode === null) {
    const stopped = new Promise(yes => application.once('exit', yes));
    application.kill('SIGTERM');
    await stopped;
  }
  await new Promise(yes => backendServer.close(yes));
}
