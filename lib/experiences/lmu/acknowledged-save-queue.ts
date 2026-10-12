export type SaveStatus = "pending" | "saved" | "failed";

// One client session: debounce drafts, settle superseded callers, and serialize
// each section's writes so an older draft cannot follow its finalization.
export function createAcknowledgedSaveQueue(options: {
  delay: number;
  setTimer: (callback: () => void, delay: number) => unknown;
  clearTimer: (timer: unknown) => void;
  onStatus: (key: string, status: SaveStatus) => void;
}) {
  type Pending = { timer?: unknown; resolve: (saved: boolean) => void };
  const pending = new Map<string, Pending>();
  const tails = new Map<string, Promise<unknown>>();
  function cancel(key: string) {
    const old = pending.get(key);
    if (old) { if (old.timer !== undefined) options.clearTimer(old.timer); old.resolve(false); pending.delete(key); }
  }
  function schedule(key: string, task: () => Promise<boolean>, immediate = false): Promise<boolean> {
    cancel(key);
    options.onStatus(key, "pending");
    return new Promise((resolve) => {
      const item: Pending = { resolve };
      pending.set(key, item);
      const run = () => {
        item.timer = undefined;
        const tail = (tails.get(key) ?? Promise.resolve()).then(async () => {
          if (pending.get(key) !== item) return false;
          try { return await task(); } catch { return false; }
        });
        tails.set(key, tail);
        void tail.then((saved) => {
          if (pending.get(key) === item) {
            pending.delete(key);
            options.onStatus(key, saved ? "saved" : "failed");
          }
          if (tails.get(key) === tail) tails.delete(key);
          resolve(saved);
        });
      };
      if (immediate) run();
      else item.timer = options.setTimer(run, options.delay);
    });
  }
  return { schedule, cancel };
}
