import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

type Category = "databaseHttp" | "storageHttp" | "authHttp" | "otherHttp";
type Operation = "course-render-data" | "course-mutation-data" | "pis-save" | "pis-finish" | "companion-update";
type Measurement = { operation: Operation; totalMs: number; requests: Record<Category, { count: number; totalMs: number }> };
type Scope = { measurement: Measurement; parent?: Scope };
const measurements = new AsyncLocalStorage<Scope>();

/** Opt-in, numeric-only diagnostics. Never records URLs, identifiers, bodies or headers. */
export async function measureOperation<T>(operation: Operation, work: () => Promise<T>): Promise<T> {
  if (process.env.WAYFINDERS_PERFORMANCE !== "1") return work();
  const measurement: Measurement = { operation, totalMs: 0, requests: { databaseHttp: { count: 0, totalMs: 0 }, storageHttp: { count: 0, totalMs: 0 }, authHttp: { count: 0, totalMs: 0 }, otherHttp: { count: 0, totalMs: 0 } } };
  const start = performance.now();
  try { return await measurements.run({ measurement, parent: measurements.getStore() }, work); }
  finally {
    measurement.totalMs = Math.round((performance.now() - start) * 100) / 100;
    for (const category of Object.values(measurement.requests)) category.totalMs = Math.round(category.totalMs * 100) / 100;
    console.info("Wayfinders performance", JSON.stringify(measurement));
  }
}

export const measuredSupabaseFetch: typeof fetch = async (input, init) => {
  const scope = measurements.getStore();
  if (!scope) return fetch(input, init);
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const category: Category = url.pathname.startsWith("/rest/") ? "databaseHttp" : url.pathname.startsWith("/storage/") ? "storageHttp" : url.pathname.startsWith("/auth/") ? "authHttp" : "otherHttp";
  const start = performance.now();
  for (let current: Scope | undefined = scope; current; current = current.parent) current.measurement.requests[category].count++;
  try { return await fetch(input, init); }
  finally {
    const elapsed = performance.now() - start;
    for (let current: Scope | undefined = scope; current; current = current.parent) current.measurement.requests[category].totalMs += elapsed;
  }
};
