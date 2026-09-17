import { safeExternalUrl } from "@/lib/experiences/builder/media-source";

function inline(source: string) {
  const pieces = source.split(/(\[[^\]]+\]\([^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return pieces.map((piece, index) => {
    const link = /^\[([^\]]+)\]\(([^)]*)\)$/.exec(piece);
    if (link) {
      const href = safeExternalUrl(link[2]);
      return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer">{link[1]}<span className="sr-only"> (opens in a new tab)</span></a> : piece;
    }
    if (piece.startsWith("**") && piece.endsWith("**")) return <strong key={index}>{piece.slice(2, -2)}</strong>;
    if (piece.startsWith("*") && piece.endsWith("*")) return <em key={index}>{piece.slice(1, -1)}</em>;
    return piece;
  });
}

export function ParticipantRichText({ title, text }: { title: string; text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { blocks.push(heading[1].length === 1 ? <h3 key={index}>{inline(heading[2])}</h3> : heading[1].length === 2 ? <h4 key={index}>{inline(heading[2])}</h4> : <h5 key={index}>{inline(heading[2])}</h5>); index += 1; continue; }
    const unordered = /^[-*]\s+/.test(line);
    const ordered = /^\d+\.\s+/.test(line);
    if (unordered || ordered) {
      const start = index;
      const items: React.ReactNode[] = [];
      while (index < lines.length && (unordered ? /^[-*]\s+/.test(lines[index].trim()) : /^\d+\.\s+/.test(lines[index].trim()))) {
        items.push(<li key={index}>{inline(lines[index].trim().replace(unordered ? /^[-*]\s+/ : /^\d+\.\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(unordered ? <ul key={start}>{items}</ul> : <ol key={start}>{items}</ol>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const start = index;
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) { quote.push(lines[index].trim().replace(/^>\s?/, "")); index += 1; }
      blocks.push(<blockquote key={start}>{inline(quote.join(" "))}</blockquote>);
      continue;
    }
    const start = index;
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,3}\s+|[-*]\s+|\d+\.\s+|>\s?)/.test(lines[index].trim())) { paragraph.push(lines[index].trim()); index += 1; }
    blocks.push(<p key={start}>{inline(paragraph.join(" "))}</p>);
  }
  return <div className="participant-rich-text-block">{title && <h3>{title}</h3>}{blocks}</div>;
}
