"use client";
import { useState } from "react";

export function WayfinderCsvDownload({ participantId }: { participantId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/wayfinders/${encodeURIComponent(participantId)}/export`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Unable to download this record.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `wayfinder-${participantId}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to download this record.");
    } finally { setLoading(false); }
  }
  return <div><button type="button" className="admin-secondary-link" disabled={loading} onClick={() => void download()}>{loading ? "Preparing CSV…" : "Download full record (CSV)"}</button>{loading && <span role="status" className="sr-only">Preparing full Wayfinder record</span>}{error && <p role="alert">{error}</p>}</div>;
}
