import {NextResponse} from 'next/server';
import {renderToBuffer} from '@react-pdf/renderer';
import {AssessmentResultPdf} from '@/components/assessment-results/AssessmentResultPdf';
import {assessmentPdfFilename} from '@/lib/assessment-pdf-content';
import {adminAssessmentDownloads} from '@/lib/admin/assessment-downloads';
import type {AssessmentResultKind} from '@/lib/assessment-results';
import {ResponseLibraryAccessError} from '@/lib/platform/response-library';
export const runtime='nodejs';
const KINDS=new Set(['life-mapping-u','wayfinders-ethos','activate-your-purpose','launching-your-wayfinders-hub','circle-of-influence','personal-impact-statement','start-something','microchurch','bridges-vs-barriers']);
const headers={'Cache-Control':'private, no-store'};
export async function GET(_request:Request,{params}:{params:Promise<{participantId:string;kind:string;resultId:string}>}){
 try{const {participantId,kind,resultId}=await params;if(!KINDS.has(kind)||![participantId,resultId].every(v=>/^[0-9a-f-]{36}$/i.test(v)))return NextResponse.json({error:'Invalid assessment.'},{status:400,headers});
 const data=await adminAssessmentDownloads(participantId,{kind:kind as AssessmentResultKind,id:resultId});if(!('result' in data)||!data.result)throw Error('Result unavailable');
 const buffer=await renderToBuffer(AssessmentResultPdf({result:data.result,participantName:data.participantName!}));
 return new NextResponse(new Uint8Array(buffer),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${assessmentPdfFilename(data.result.name,data.participantName!,data.result.completedAt)}"`,'X-Content-Type-Options':'nosniff'}});
 }catch(e){const status=e instanceof ResponseLibraryAccessError?e.status:500;return NextResponse.json({error:status===403?'Admin access is required.':status===404?'Completed assessment not found.':'Unable to prepare the assessment PDF. Please retry.'},{status,headers});}
}
