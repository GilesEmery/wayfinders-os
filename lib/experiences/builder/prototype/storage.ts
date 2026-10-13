import { DEMO_STORAGE_KEY, parsePrototype, serializePrototype, type PrototypeCourse } from "./model";
export type DemoReceipt = { revision: string; payload: PrototypeCourse };
export type LocalStore = Pick<Storage,"getItem"|"setItem"|"removeItem">;
export function readDemo(store:LocalStore,key=DEMO_STORAGE_KEY):DemoReceipt|null {
 const raw=store.getItem(key);if(!raw)return null;const record=JSON.parse(raw);if(record.schemaVersion!==1||typeof record.revision!=="string")throw new Error("The stored demo needs recovery.");return {revision:record.revision,payload:parsePrototype(JSON.stringify(record.payload))};
}
export function saveDemo(store:LocalStore,course:PrototypeCourse,expectedRevision:string|null,newRevision:string,key=DEMO_STORAGE_KEY):DemoReceipt {
 const previous=readDemo(store,key);if((previous?.revision??null)!==expectedRevision)throw new Error("conflict");
 const payload=parsePrototype(serializePrototype(course));store.setItem(key,JSON.stringify({schemaVersion:1,revision:newRevision,payload}));
 const receipt=readDemo(store,key);if(receipt?.revision!==newRevision)throw new Error("conflict");return receipt;
}
