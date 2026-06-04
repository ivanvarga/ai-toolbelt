const { test } = require('node:test');
const assert = require('node:assert/strict');

const BIG = {
  type: 'flowchart', direction: 'LR',
  groups: [
    { id: 'g_a', label: 'apps', nodeIds: ['a1', 'a2'] },
    { id: 'g_b', label: 'shared', nodeIds: ['b1'] },
  ],
  nodes: [
    { id: 'a1', label: 'a1' }, { id: 'a2', label: 'a2' }, { id: 'b1', label: 'b1' },
  ],
  links: [{ from: 'a1', to: 'a2', type: 'neutral' }, { from: 'a2', to: 'b1', type: 'neutral' }],
};

test('mermaid-split', async (t) => {
  const { splitFlowchart } = await import('../../skills/mermaid-render/scripts/lib/split.mjs');

  await t.test('passes through when under threshold', () => {
    const parts = splitFlowchart(BIG, 25);
    assert.equal(parts.length, 1);
    assert.equal(parts[0].heading, null);
  });

  await t.test('splits into overview + per-group above threshold', () => {
    const parts = splitFlowchart(BIG, 2);
    assert.deepEqual(parts.map((p) => p.heading), ['Overview', 'apps', 'shared']);
  });

  await t.test('overview has one node per group + cross-group edge only', () => {
    const ov = splitFlowchart(BIG, 2)[0].model;
    assert.equal(ov.nodes.length, 2);
    assert.match(ov.nodes[0].label, /apps \(2\)/);
    assert.deepEqual(ov.links, [{ from: 'g_a', to: 'g_b', type: 'neutral' }]);
  });

  await t.test('group diagram keeps only intra-group links', () => {
    const apps = splitFlowchart(BIG, 2).find((p) => p.heading === 'apps').model;
    assert.equal(apps.nodes.length, 2);
    assert.deepEqual(apps.links, [{ from: 'a1', to: 'a2', type: 'neutral' }]);
  });
});
