// Read-only copy of the exact authoring resource allowlist captured for this review.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root='.local/course-review',snapshot=JSON.parse(await readFile(`${root}/hub-leader-resources.json`,'utf8'));
const origin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);if(origin.origin!=='https://xxjiiqrhnniccnxujmnv.supabase.co')throw Error('Wrong source project');
const secret=process.env.SUPABASE_SECRET_KEY;if(!secret)throw Error('Missing server connection');
await mkdir(`${root}/assets`,{recursive:true});let total=0;const assets=[],failures=[];
for(const resource of snapshot.resources){
 if(!resource.storage_path)continue;
 if(resource.storage_bucket!=='purposeos-assets'||!resource.storage_path.startsWith('courses/')||resource.storage_path.includes('..'))throw Error('Resource outside allowed course Storage scope');
 const suffix=resource.mime_type==='application/pdf'?'.pdf':resource.mime_type==='image/png'?'.png':resource.mime_type==='image/jpeg'?'.jpg':null;if(!suffix)throw Error('Unexpected course media type');
 try{const url=new URL(`/storage/v1/object/authenticated/${resource.storage_bucket}/${resource.storage_path.split('/').map(encodeURIComponent).join('/')}`,origin);
 const response=await fetch(url,{method:'GET',redirect:'error',headers:{apikey:secret,Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`HTTP ${response.status}`);
 const data=new Uint8Array(await response.arrayBuffer());if(data.length>25*1024*1024||total+data.length>150*1024*1024)throw Error('Asset size exceeds review bound');total+=data.length;
 const signature=Buffer.from(data.subarray(0,8));if(resource.mime_type==='application/pdf'&&!signature.toString().startsWith('%PDF-'))throw Error('Invalid PDF bytes');if(resource.mime_type==='image/png'&&signature.toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG bytes');if(resource.mime_type==='image/jpeg'&&signature.subarray(0,2).toString('hex')!=='ffd8')throw Error('Invalid JPEG bytes');
 const name=resource.id+suffix;await writeFile(`${root}/assets/${name}`,data);assets.push({id:resource.id,path:`/review-assets/${name}`,mime:resource.mime_type,bytes:data.length});
 }catch(error){failures.push({id:resource.id,error:error.message});}
}
const report={assets,failures,totalBytes:total};await writeFile(`${root}/asset-manifest.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({copied:assets.length,failed:failures.length,totalBytes:total}));if(failures.length)process.exitCode=1;
