const { test } = require('node:test');
const assert = require('node:assert/strict');

const BIG = {
  type: 'flowchart',
  groups: [{ id: 'g_a', label: 'apps', nodeIds: ['a1'] }, { id: 'g_b', label: 'shared', nodeIds: ['b1'] }],
  nodes: [{ id: 'a1', label: 'a1' }, { id: 'b1', label: 'b1' }],
  links: [{ from: 'a1', to: 'b1', type: 'neutral' }],
};

test('mermaid-render-split', async (t) => {
  const { renderToMarkdown } = await import('../../skills/mermaid-render/scripts/render.mjs');

  await t.test('no split -> single fenced block, no headings', () => {
    const md = renderToMarkdown(BIG, { split: false });
    assert.match(md, /```mermaid/);
    assert.doesNotMatch(md, /^### /m);
  });

  await t.test('split above threshold -> Overview + group headings', () => {
    const md = renderToMarkdown(BIG, { split: true, threshold: 1 });
    assert.match(md, /### Overview/);
    assert.match(md, /### apps/);
    assert.match(md, /### shared/);
  });

  await t.test('unknown type throws', () => {
    assert.throws(() => renderToMarkdown({ type: 'pie' }), /unknown model type "pie"/);
  });
});
