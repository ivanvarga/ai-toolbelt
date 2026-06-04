const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ENTRY = path.join(__dirname, '..', '..', 'skills', 'mermaid-render', 'scripts', 'render.mjs');

function run(model) {
  return execFileSync('node', [ENTRY], { input: JSON.stringify(model), encoding: 'utf8' });
}

test('mermaid-render-dispatch', async (t) => {
  await t.test('routes flowchart', () => {
    const out = run({ type: 'flowchart', nodes: [{ id: 'a', label: 'A' }], links: [] });
    assert.match(out, /flowchart TD/);
  });
  await t.test('routes class', () => {
    const out = run({ type: 'class', nodes: [{ id: 'A', members: [] }], links: [] });
    assert.match(out, /classDiagram/);
  });
  await t.test('routes er', () => {
    const out = run({ type: 'er', nodes: [{ id: 'A', attributes: [] }], links: [] });
    assert.match(out, /erDiagram/);
  });
  await t.test('unknown type exits non-zero with helpful message', () => {
    assert.throws(() => run({ type: 'pie' }), (e) => {
      assert.match(String(e.stderr), /unknown model type "pie"[\s\S]*flowchart, class, er/);
      return true;
    });
  });
});
