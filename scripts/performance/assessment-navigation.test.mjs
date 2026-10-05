import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from './offline-module.mjs';

const cases = [
  ['ActivatePurposeAssessment', 'activate-purpose-assessment', 'ACTIVATE_PURPOSE_QUESTIONS', 'saveActivatePurposeAssessmentAction'],
  ['LaunchingWayfindersHubAssessment', 'launching-wayfinders-hub-assessment', 'LAUNCHING_HUB_QUESTIONS', 'saveLaunchingWayfindersHubAssessmentAction'],
];
function children(node) {
  if (Array.isArray(node)) return node.flatMap(children);
  if (!node || typeof node !== 'object') return [];
  return [node, ...children(node.props?.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (node && typeof node === 'object') return text(node.props?.children);
  return node == null ? '' : String(node);
}
for (const [component, dataFile, questionsKey, action] of cases) {
  test(`${component}: select stays put; Back then Next works without reselecting; results require explicit navigation`, () => {
    const slots = []; let index = 0;
    const react = {
      useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; },
      useRef(initial) { const slot = index++; slots[slot] ??= { current: initial }; return slots[slot]; },
      useEffect() {},
    };
    const jsx = (type, props) => ({ type, props });
    const data = load(`lib/experiences/builder/${dataFile}.ts`, {});
    const assessmentModule = load(`components/experiences/builder/${component}.tsx`, {
      react, 'react-dom': {}, 'react/jsx-runtime': { jsx, jsxs: jsx },
      [`@/lib/experiences/builder/${dataFile}`]: data,
      [`@/lib/experiences/builder/${dataFile}-actions`]: { [action]() { throw new Error('No real saves permitted'); } },
      './AssessmentFocusFrame': {}, './AssessmentLaunchCard': {},
    });
    const render = () => { index = 0; return assessmentModule[component]({ initialData: {}, route: {}, preview: true, autoStart: true }); };
    const button = (tree, label) => children(tree).find(node => node.type === 'button' && text(node).includes(label));
    const selectedInput = tree => children(tree).find(node => node.type === 'input');
    let tree = render();
    assert.equal(button(tree, 'Next question').props.disabled, true);
    assert.equal(button(tree, 'Back').props.disabled, true);
    const firstKey = selectedInput(tree).props.name;
    selectedInput(tree).props.onChange(); tree = render();
    assert.equal(selectedInput(tree).props.name, firstKey, 'selection must not advance');
    button(tree, 'Next question').props.onClick(); tree = render();
    const secondKey = selectedInput(tree).props.name;
    assert.notEqual(secondKey, firstKey);
    button(tree, 'Back').props.onClick(); tree = render();
    assert.equal(selectedInput(tree).props.checked, true);
    assert.equal(button(tree, 'Next question').props.disabled, false);
    button(tree, 'Next question').props.onClick(); tree = render();
    assert.equal(selectedInput(tree).props.name, secondKey);
    for (let question = 1; question < data[questionsKey].length; question++) {
      selectedInput(tree).props.onChange(); tree = render();
      const next = button(tree, question === data[questionsKey].length - 1 ? 'View results' : 'Next question');
      assert.equal(next.props.disabled, false);
      if (question < data[questionsKey].length - 1) { next.props.onClick(); tree = render(); }
    }
    assert.ok(selectedInput(tree), 'last selection must remain on the question');
    button(tree, 'View results').props.onClick(); tree = render();
    assert.ok(button(tree, 'Review answers'));
    button(tree, 'Review answers').props.onClick(); tree = render();
    assert.equal(selectedInput(tree).props.name, firstKey);
    assert.equal(button(tree, 'Next question').props.disabled, false);
  });
}
