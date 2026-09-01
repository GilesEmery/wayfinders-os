import { LMU_ORIGINAL_EXPERIENCE_ID } from "@/lib/experiences/lmu/original-journey";
import { getModuleProgress, saveModuleProgress } from "@/lib/experiences/lmu/storage";
import { motivatorDefinitions, motivatorById } from "./curriculum";
import { motivatorIds, type MotivatorRankingResponse } from "./types";
const MODULE_ID = "current-motivator-rankings";
export const emptyMotivatorRankingResponse = (): MotivatorRankingResponse => ({ orderedMotivatorIds: [], resumeScreen:"introduction" });
export const isValidMotivatorOrder = (ids: string[]) => ids.length === motivatorIds.length && new Set(ids).size === motivatorIds.length && motivatorIds.every((id) => ids.includes(id));
export function areMotivatorSourcesComplete() { return motivatorDefinitions.every((item) => getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID,item.sourceModuleId)?.status === "completed"); }
export function saveMotivatorRankingResponse(response: MotivatorRankingResponse, complete = false) {
  const existing=getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID,MODULE_ID); const valid=isValidMotivatorOrder(response.orderedMotivatorIds) && Boolean(response.finalizedAt) && areMotivatorSourcesComplete();
  const status=complete&&valid?"completed":existing?.status==="completed"&&valid?"completed":"in-progress"; const completedAt=status==="completed"?existing?.completedAt??new Date().toISOString():undefined;
  saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID,{moduleId:MODULE_ID,status,startedAt:existing?.startedAt??new Date().toISOString(),completedAt,responses:response as unknown as Record<string,unknown>,derivedResults:{orderedMotivatorIds:response.orderedMotivatorIds,topPriorityReflection:response.topPriorityReflection},result:status==="completed"?{moduleId:MODULE_ID,completedAt,highlights:response.orderedMotivatorIds.map((id)=>motivatorById.get(id)?.label??id),rankedItems:response.orderedMotivatorIds.map((id,index)=>({id,label:motivatorById.get(id)?.label??id,rank:index+1})),structuredData:{orderedMotivatorIds:response.orderedMotivatorIds,topPriorityReflection:response.topPriorityReflection}}:existing?.result});
}
export async function completeMotivatorRanking(response: MotivatorRankingResponse){
  const existing=getModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID,MODULE_ID); const valid=isValidMotivatorOrder(response.orderedMotivatorIds) && Boolean(response.finalizedAt) && areMotivatorSourcesComplete();
  if(!valid)return false; const completedAt=existing?.completedAt??new Date().toISOString();
  return saveModuleProgress(LMU_ORIGINAL_EXPERIENCE_ID,{moduleId:MODULE_ID,status:"completed",startedAt:existing?.startedAt??new Date().toISOString(),completedAt,responses:response as unknown as Record<string,unknown>,derivedResults:{orderedMotivatorIds:response.orderedMotivatorIds,topPriorityReflection:response.topPriorityReflection},result:{moduleId:MODULE_ID,completedAt,highlights:response.orderedMotivatorIds.map((id)=>motivatorById.get(id)?.label??id),rankedItems:response.orderedMotivatorIds.map((id,index)=>({id,label:motivatorById.get(id)?.label??id,rank:index+1})),structuredData:{orderedMotivatorIds:response.orderedMotivatorIds,topPriorityReflection:response.topPriorityReflection}}});
}
