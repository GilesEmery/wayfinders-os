// Isolated in-memory PostgreSQL verification. Never connects to Supabase.
// Supply a local PGlite module path when it is installed outside this repository.
const { PGlite } = await import(process.argv[2] || '@electric-sql/pglite');
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=process.cwd();
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role; create role supabase_auth_admin;
create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql as 'select null::uuid';
create function auth.jwt() returns jsonb language sql as 'select ''{}''::jsonb';
create function auth.role() returns text language sql as 'select ''service_role''::text';
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
const directory=resolve(root,'supabase/migrations');
for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')&&n<'20261002181510').sort()) {
  try { await db.exec(await readFile(resolve(directory,name),'utf8')); }
  catch(e) { console.error('Migration failed:',name,e.message); await db.close(); process.exit(1); }
}
await db.exec('begin;');
await db.exec(await readFile(resolve(directory,'20261002182856_section_move_content_cascade.sql'),'utf8'));
let result; try { result=await db.exec(await readFile(resolve(root,'supabase/tests/section_movement.sql'),'utf8')); } catch(e) { console.error(e.message,e.detail,e.where); await db.close(); process.exit(1); }
console.log(JSON.stringify(result.at(-1).rows));
await db.exec('rollback;');
await db.close();
