import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from './offline-module.mjs';
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
for (const count of [0, 1, 3, 5]) test(`${count} selected settings create exactly ${count} populated circle pages`, () => {
  const slots = []; let index = 0;
  const react = {
    useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; },
    useRef(initial) { const slot = index++; slots[slot] ??= { current: initial }; return slots[slot]; }, useCallback: fn => fn, useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const data = load('lib/experiences/builder/start-something.ts', {});
  const assessment = load('components/experiences/builder/StartSomethingExperience.tsx', { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': {}, 'lucide-react': {}, '@/lib/experiences/builder/start-something': data, '@/lib/experiences/builder/start-something-actions': {} });
  const render = () => { index = 0; return assessment.StartSomethingExperience({ initialData: {}, route: {}, preview: true }); };
  const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && text(node).includes(label));
  let tree = render(); button(tree, data.START_SOMETHING_STAGES[4]).props.onClick(); tree = render();
  const places = data.START_SOMETHING_NETWORK_PLACES.slice(0, count);
  for (const place of places) { nodes(tree).find(node => node.props?.role === 'checkbox' && text(node) === place).props.onClick(); tree = render(); }
  button(tree, 'Next step').props.onClick(); tree = render();
  for (const place of places) {
    const location = nodes(tree).find(node => node.type === 'textarea' && node.props.placeholder === 'Name this setting');
    assert.equal(location?.props.value, place);
    button(tree, 'Next step').props.onClick(); tree = render();
  }
  assert.ok(nodes(tree).some(node => node.props?.label?.includes('more than 5 locations')), 'must proceed directly to additional locations');
});
