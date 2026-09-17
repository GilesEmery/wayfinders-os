"use client";

import { useMemo, useState } from "react";

type AssetOption = Readonly<{ id: string; title: string; original_filename: string | null; mime_type: string | null }>;

export function AssetSelect({ assets, label = "Choose Existing", autoFocus = false }: { assets: readonly AssetOption[]; label?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (needle ? assets.filter((asset) => `${asset.title} ${asset.original_filename ?? ""} ${asset.mime_type ?? ""}`.toLowerCase().includes(needle)) : assets).slice(0, 40);
  }, [assets, query]);
  return <div className="admin-asset-select"><label>Search assets<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or filename" autoComplete="off" autoFocus={autoFocus}/></label><label>{label}<select name="resource_id" required defaultValue="" disabled={!assets.length}><option value="" disabled>{assets.length ? "Select an asset" : "No uploaded assets yet"}</option>{filtered.map((asset) => <option value={asset.id} key={asset.id}>{asset.title} · {asset.original_filename ?? asset.mime_type ?? "Uploaded file"}</option>)}</select></label><small>{query && !filtered.length ? "No matching assets." : `${assets.length} reusable asset${assets.length === 1 ? "" : "s"} available.`}</small></div>;
}
