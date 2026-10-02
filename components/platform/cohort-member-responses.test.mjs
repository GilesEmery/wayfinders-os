import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function fixture(fetchResult) {
  const effects = [], states = [], timers = new Map();
  let nextTimer = 0;
  const react = {
    useRef: () => ({ current: null }),
    useState(value) { const index = states.push(value) - 1; return [value, (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useEffect(effect) { effects.push(effect); },
  };
  const dependencies = {
    react,
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'react-dom': { createPortal: () => null },
    './SavedResponseLibrary': { SavedResponseLibrary: () => null },
  };
  const source = readFileSync(new URL('./CohortMemberResponsesButton.tsx', import.meta.url), 'utf8').replace('function MemberResponsesDialog(', 'export function MemberResponsesDialog(');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  let signal;
  const fetch = (_url, options) => { signal = options.signal; return fetchResult(signal); };
  const window = { setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; }, clearTimeout(id) { timers.delete(id); } };
  const document = { body: { style: { overflow: '' } } };
  new Function('require', 'exports', 'fetch', 'window', 'document', compiled)((name) => { assert.ok(dependencies[name], name); return dependencies[name]; }, exports, fetch, window, document);
  exports.MemberResponsesDialog({ cohortId: 'cohort', participantId: 'member', name: 'Member', onClose() {} });
  const cleanup = effects.map((effect) => effect());
  return { states, timers, cleanup: () => cleanup.forEach((fn) => fn?.()), signal: () => signal, timeout: () => [...timers.values()].forEach((callback) => callback()) };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('successful responses replace loading and clear the timeout', async () => {
  const data = { name: 'Member', courses: [] };
  const f = fixture(async () => ({ ok: true, json: async () => data }));
  await flush();
  assert.deepEqual(f.states[0], data);
  assert.equal(f.states[1], '');
  assert.equal(f.timers.size, 0);
  f.cleanup();
});
test('a stalled request shows a retryable error and aborts', async () => {
  const f = fixture((signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
  f.timeout();
  await flush();
  assert.match(f.states[1], /taking too long/);
  assert.equal(f.signal().aborted, true);
  assert.equal(f.timers.size, 0);
  f.cleanup();
});
test('closing the panel cancels the request without setting an error', async () => {
  const f = fixture((signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
  f.cleanup();
  await flush();
  assert.equal(f.signal().aborted, true);
  assert.equal(f.states[1], '');
  assert.equal(f.timers.size, 0);
});
test('access errors replace loading with an explanation', async () => {
  const f = fixture(async () => ({ ok: false, status: 403 }));
  await flush();
  assert.match(f.states[1], /do not have access/);
  assert.equal(f.timers.size, 0);
  f.cleanup();
});
