import {mkdir,readdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function integrationFonts(repo,scratch){
 const target=join(scratch,'public/rehearsal-fonts');await mkdir(target,{recursive:true});const faces=[];
 for(const name of await readdir(join(repo,'.next/static/css')).catch(()=>[])){
  if(!name.endsWith('.css'))continue;const css=await readFile(join(repo,'.next/static/css',name),'utf8');
  for(const match of css.matchAll(/@font-face\s*\{[^}]*\}/g)){let face=match[0];const family=/font-family:([^;]+)/.exec(face)?.[1];if(!family||!(/Geist|Cormorant/i.test(family)))continue;const paths=[...face.matchAll(/(?:\/|\.\/)([\w.-]+\.woff2)/g)].map(m=>m[1]);if(!paths.length)continue;
   for(const asset of paths){try{await copyFile(join(repo,'.next/static/media',asset),join(target,asset));face=face.replaceAll('/_next/static/media/'+asset,'/rehearsal-fonts/'+asset).replaceAll('../media/'+asset,'/rehearsal-fonts/'+asset);}catch{face='';}}
   if(face)faces.push(face.replace(/font-family:[^;]+;/,`font-family:${/Cormorant/i.test(family)?'RehearsalEditorial':'RehearsalSans'};`));
  }
 }
 await writeFile(join(scratch,'app/rehearsal-fonts.css'),[...new Set(faces)].join('\n'));
}
