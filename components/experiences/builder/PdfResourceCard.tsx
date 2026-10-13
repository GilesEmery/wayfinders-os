type Props = {title:string;description?:string|null;url:string;downloadUrl?:string;allowOpenInNewTab:boolean;allowDownload:boolean};
export function PdfResourceCard({title,description,url,downloadUrl,allowOpenInNewTab,allowDownload}:Props){
 return <figure className="participant-pdf-reader is-resource-only">
  <figcaption><svg className="pdf-resource-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M7 2h18l10 10v34H7zM25 2v11h10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><text x="21" y="33" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="700" fontFamily="sans-serif">PDF</text></svg><div><strong>{title}</strong>{description&&<span>{description}</span>}</div></figcaption>
  {(allowOpenInNewTab||allowDownload)&&<div className="participant-pdf-actions">
   {allowOpenInNewTab&&<a href={url} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 3h7v7M21 3l-10 10M10 4H4v16h16v-6" strokeLinecap="round" strokeLinejoin="round"/></svg>Open in new tab<span className="sr-only">: {title}</span></a>}
   {allowDownload&&<a href={downloadUrl??url}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" strokeLinecap="round" strokeLinejoin="round"/></svg>Download<span className="sr-only"> {title}</span></a>}
  </div>}
 </figure>;
}
