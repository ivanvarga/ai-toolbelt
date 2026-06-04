const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODEL = {
  type: 'flowchart',
  direction: 'TD',
  groups: [{ id: 'auth', label: 'providers/auth', nodeIds: ['a'] }],
  nodes: [
    { id: 'a', label: 'auth: login()', shape: 'action', category: 'new', url: 'http://x/a' },
    { id: 'b', label: 'ok?', shape: 'decision', category: 'modified' },
  ],
  links: [{ from: 'a', to: 'b', label: 'success', type: 'happy' }],
};

test('mermaid-flowchart', async (t) => {
  const { renderFlowchart } = await import('../../skills/mermaid-render/scripts/renderers/flowchart.mjs');
  const out = renderFlowchart(MODEL);

  await t.test('has init directive and flowchart header', () => {
    assert.match(out, /%%\{init:/);
    assert.match(out, /flowchart TD/);
  });
  await t.test('subgraph wraps grouped node', () => {
    assert.match(out, /subgraph auth\["providers\/auth"\]/);
  });
  await t.test('action node rounded + clickable <u>, decision node diamond', () => {
    assert.match(out, /a\("<u>auth: login\(\)<\/u>"\)/);
    assert.match(out, /b\{"ok\?"\}/);
  });
  await t.test('link uses happy connector + label', () => {
    assert.match(out, /a --> \|success\| b/);
  });
  await t.test('classDef + class assignment by category', () => {
    assert.match(out, /classDef new fill:#4ade80/);
    assert.match(out, /class a new/);
    assert.match(out, /class b modified/);
  });
  await t.test('click + LINKS comment emitted for url node', () => {
    assert.match(out, /click a "http:\/\/x\/a" _blank/);
    assert.match(out, /<!-- LINKS: \{"a":"http:\/\/x\/a"\} -->/);
  });
});
