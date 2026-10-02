import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('./SavedResponseLibrary.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const exports = {};
new Function('require', 'exports', compiled)(require, exports);
function render(activity) {
  return renderToStaticMarkup(createElement(exports.SavedResponseLibrary, { data: { name: 'Member', courses: [{ id: 'course', title: 'Course', version: 'Published', weeks: [{ id: 'week', title: 'Week 1', activities: [activity] }] }] } }));
}
const activity = { id: 'purpose', title: 'Activate Your Purpose', location: '', status: 'submitted', updatedAt: '', assessment: true, items: [{ question: 'Question one', response: 'Answer one' }], results: [{ question: 'Highest areas', response: 'Everyday Impact · 20 / 20' }] };
test('assessment summaries render above individual answers within the expandable assessment', () => {
  const html = render(activity);
  assert.match(html, /View assessment results and responses/);
  assert.match(html, /Highest areas/);
  assert.match(html, /Everyday Impact · 20 \/ 20/);
  assert.ok(html.indexOf('Assessment results') < html.indexOf('Individual responses'));
  assert.ok(html.indexOf('Individual responses') < html.indexOf('Question one'));
});
test('locked assessments render neither results nor answers', () => {
  const html = render({ ...activity, locked: true, href: '/experiences/activate-your-purpose' });
  assert.match(html, /Open this Experience/);
  assert.doesNotMatch(html, /Highest areas|Everyday Impact|Question one|Answer one/);
});
test('incomplete assessments keep answers available without claiming results', () => {
  const html = render({ ...activity, status: 'draft', results: [] });
  assert.doesNotMatch(html, /<h4>Assessment results/);
  assert.match(html, /Question one/);
});
test('facilitator view displays answer counts and unanswered questions', () => {
  const html = render({ ...activity, status: 'draft', results: [], items: [{ question: 'First prompt', response: 'Answered', answered: true }, { question: 'Second prompt', response: 'Not answered', answered: false }] });
  assert.match(html, /1 \/ 2 questions answered/);
  assert.match(html, /Second prompt/);
  assert.match(html, /saved-response-unanswered/);
  assert.match(html, /Not answered/);
});

function lazyFixture(fetchResponse) {
  const slots = [], effects = [], requests = [];
  let cursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (next) => { slots[index] = next; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useEffect(effect) { effects.push(effect); },
  };
  const dependencies = { react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) } };
  const lazySource = source.replace('function LazyResponseBox(', 'export function LazyResponseBox(');
  const code = ts.transpileModule(lazySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const lazyExports = {};
  const fetch = (url, options) => { requests.push({ url, options }); return fetchResponse(options.signal); };
  new Function('require', 'exports', 'fetch', 'window', code)((name) => dependencies[name], lazyExports, fetch, { setTimeout, clearTimeout });
  const render = () => { cursor = 0; return lazyExports.LazyResponseBox({ title: 'Assessment', assessment: true, loadKey: 'version:assessment:block', endpoint: '/member/responses' }); };
  let box = render();
  const cleanup = effects[0]();
  return { requests, slots, render, toggle: (open) => box.props.onToggle({ currentTarget: { open } }), cleanup };
}
const flushLazy = () => new Promise((resolve) => setImmediate(resolve));
test('lazy boxes fetch only on opening, deduplicate pending requests, and reuse loaded answers', async () => {
  let resolve;
  const f = lazyFixture(() => new Promise((done) => { resolve = done; }));
  assert.equal(f.requests.length, 0);
  f.toggle(false);
  assert.equal(f.requests.length, 0);
  f.toggle(true); f.toggle(true);
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].url, '/member/responses?box=version%3Aassessment%3Ablock');
  resolve({ ok: true, json: async () => [activity] });
  await flushLazy();
  const loaded = f.render();
  loaded.props.onToggle({ currentTarget: { open: true } });
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.slots[0], [activity]);
  f.cleanup();
});
test('closing the popup aborts pending box requests', async () => {
  const f = lazyFixture((signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
  f.toggle(true); f.cleanup();
  await flushLazy();
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.slots[1], '');
});
