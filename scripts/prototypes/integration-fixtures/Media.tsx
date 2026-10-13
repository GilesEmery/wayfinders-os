import Image from 'next/image';
export function ParticipantMediaBlock({kind,config,asset}:{kind:string;config:Record<string,unknown>;asset?:{url:string;title?:string}}){return <figure><h3>{String(config.title??asset?.title??kind)}</h3>{kind==='image'&&asset?.url?<Image src={asset.url} alt={String(config.alt??'')} width={1200} height={800} unoptimized style={{width:'100%',height:'auto'}}/>:<p>Offline rehearsal · original resource configuration retained</p>}</figure>;}
export function ParticipantPdfReader(){return <div>Offline PDF rehearsal · linked local resource preserved</div>;}
