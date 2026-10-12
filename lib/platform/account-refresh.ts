// One account fetch per concurrent Auth event. A newer identity or sign-out
// invalidates earlier completions; this is not an authorization cache.
export function createAccountRefresh<T>(read: (signal: AbortSignal) => Promise<T | null>, apply: (value: T | null) => void) {
  let generation = 0;
  let pending: { identity: string; promise: Promise<void>; controller: AbortController } | null = null;
  return {
    refresh(identity: string) {
      if (pending?.identity === identity) return pending.promise;
      pending?.controller.abort();
      const requestGeneration = ++generation;
      const controller = new AbortController();
      const promise = Promise.resolve().then(() => read(controller.signal)).then(value => {
        if (requestGeneration === generation) apply(value);
      }).catch(() => {
        if (requestGeneration === generation) apply(null);
      }).finally(() => { if (requestGeneration === generation) pending = null; });
      pending = { identity, promise, controller };
      return promise;
    },
    clear() { generation++; pending?.controller.abort(); pending = null; apply(null); },
    dispose() { generation++; pending?.controller.abort(); pending = null; },
  };
}
