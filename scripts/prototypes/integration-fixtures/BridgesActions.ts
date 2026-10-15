"use server";
import {readRehearsalState,writeRehearsalState} from './rehearsal-state';
import {projectBridgesSave} from '@/lib/experiences/builder/bridges-barriers';
function persist(input:unknown,finish:boolean,retake?:string){const state=readRehearsalState();if(state.assessmentReviews?.failSave)throw Error('Simulated save failure. Your answers remain here; please retry.');const envelope=projectBridgesSave(state.assessmentReviews?.bridges??{},input,new Date().toISOString(),finish,retake);writeRehearsalState({...state,assessmentReviews:{...state.assessmentReviews,bridges:envelope}});return {envelope,completedAt:envelope.finished?.completedAt??null,updatedAt:new Date().toISOString(),status:envelope.finished?'submitted':'draft'} as const;}
export async function saveBridgesBarriersAction(_slug:string,_moduleKey:string,_lessonKey:string,_sectionKey:string,_blockKey:string,_cohortId:string|null|undefined,input:unknown){return persist(input,false);}
export async function finishBridgesBarriersAction(_slug:string,_moduleKey:string,_lessonKey:string,_sectionKey:string,_blockKey:string,_cohortId:string|null|undefined,input:unknown,retake?:string){return persist(input,true,retake);}
