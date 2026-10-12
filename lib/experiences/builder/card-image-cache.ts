// Bounded URL reuse only, never an authorization or resource-metadata cache.
export function createCardImageCache(now: () => number = Date.now, capacity = 256) {
  const entries = new Map<string, { url: string; expiresAt: number }>();
  return {
    get(key: string) {
      const item = entries.get(key);
      if (!item) return null;
      if (item.expiresAt <= now()) { entries.delete(key); return null; }
      return item.url;
    },
    set(key: string, url: string, issuedAt: number) {
      // Leave five minutes of the existing fifteen-minute signature lifetime.
      if (issuedAt + 600_000 <= now()) return;
      for (const [id, item] of entries) if (item.expiresAt <= now()) entries.delete(id);
      entries.delete(key);
      while (entries.size >= capacity) entries.delete(entries.keys().next().value!);
      entries.set(key, { url, expiresAt: issuedAt + 600_000 });
    },
  };
}
