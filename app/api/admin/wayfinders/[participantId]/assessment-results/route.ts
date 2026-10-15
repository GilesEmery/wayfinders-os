import {NextResponse} from 'next/server';
import {adminAssessmentDownloads} from '@/lib/admin/assessment-downloads';
import {ResponseLibraryAccessError} from '@/lib/platform/response-library';
const headers={'Cache-Control':'private, no-store'};
export async function GET(_request:Request,{params}:{params:Promise<{participantId:string}>}){
 try{const {participantId}=await params;if(!/^[0-9a-f-]{36}$/i.test(participantId))return NextResponse.json({error:'Invalid Wayfinder.'},{status:400,headers});return NextResponse.json(await adminAssessmentDownloads(participantId),{headers});}
 catch(e){const status=e instanceof ResponseLibraryAccessError?e.status:500;return NextResponse.json({error:status===403?'Admin access is required.':status===404?'Wayfinder not found.':'Unable to load assessment downloads.'},{status,headers});}
}
