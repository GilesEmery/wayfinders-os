import {Globe,ExternalLink} from 'lucide-react';
import {safeExternalUrl} from '@/lib/experiences/builder/media-source';
export function ExternalResourceCard({title,url,subtext,label='Open'}:{title:string;url:string;subtext?:string;label?:string}){
 const href=safeExternalUrl(url);
 if(!href)return <div className="participant-block-unavailable" role="status">Enter a valid HTTPS link to preview this resource.</div>;
 const host=new URL(href).hostname.replace(/^www\./,'');
 return <aside className="external-resource-card"><Globe className="external-resource-web-icon" size={24} aria-hidden="true"/><div className="external-resource-copy"><strong>{title||host}</strong><p>{subtext||`External resource · ${host}`}</p></div><a href={href} target="_blank" rel="noopener noreferrer">{label||'Open'}<ExternalLink size={16} aria-hidden="true"/><span className="sr-only">: {title||host} (opens in a new tab)</span></a></aside>;
}
