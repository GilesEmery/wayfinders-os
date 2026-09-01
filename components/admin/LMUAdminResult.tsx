import { humanize } from "@/lib/admin/format";

type RankedItem = { id?: string; label?: string; rank?: number };

function ScalarValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span>—</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "string" || typeof value === "number") return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span>—</span>;
    return <ul>{value.map((item, index) => <li key={index}>{typeof item === "object" && item ? <StructuredData value={item as Record<string, unknown>} /> : <ScalarValue value={item} />}</li>)}</ul>;
  }
  return <StructuredData value={value as Record<string, unknown>} />;
}

function StructuredData({ value }: { value: Record<string, unknown> }) {
  return <dl className="admin-structured-data">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd><ScalarValue value={item} /></dd></div>)}</dl>;
}

export function LMUAdminResult({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return <p>No finalized result.</p>;
  const envelope = value as Record<string, unknown>;
  const result = envelope.result && typeof envelope.result === "object" ? envelope.result as Record<string, unknown> : envelope;
  const rankedItems = Array.isArray(result.rankedItems) ? result.rankedItems as RankedItem[] : [];
  const highlights = Array.isArray(result.highlights) ? result.highlights.filter((item): item is string => typeof item === "string") : [];
  const structuredData = result.structuredData && typeof result.structuredData === "object" ? result.structuredData as Record<string, unknown> : null;
  return <div className="admin-final-result">
    {typeof result.summary === "string" && result.summary && <p className="admin-result-summary">{result.summary}</p>}
    {rankedItems.length > 0 && <ol className="admin-ranked-result">{[...rankedItems].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((item, index) => <li key={item.id ?? `${item.label}-${index}`}><span>{item.rank ?? index + 1}</span><strong>{item.label ?? item.id ?? "Result"}</strong></li>)}</ol>}
    {highlights.length > 0 && <section><h3>{rankedItems.length ? "Highlights" : "Final selections"}</h3><ul className="admin-highlight-result">{highlights.map((highlight, index) => <li key={`${highlight}-${index}`}>{highlight}</li>)}</ul></section>}
    {structuredData && Object.keys(structuredData).length > 0 && <details className="admin-result-details"><summary>View supporting details</summary><StructuredData value={structuredData} /></details>}
  </div>;
}
