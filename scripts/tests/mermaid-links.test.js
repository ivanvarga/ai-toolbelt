const { test } = require('node:test');
const assert = require('node:assert/strict');

test('mermaid-links', async (t) => {
  const { flowchartLink, classLink, erLink } = await import('../../skills/mermaid-render/scripts/lib/links.mjs');

  await t.test('flowchart known + unknown fallback', () => {
    assert.equal(flowchartLink('happy').connector, '-->');
    assert.equal(flowchartLink('deleted').connector, '-.->');
    assert.equal(flowchartLink('nope').color, flowchartLink('neutral').color);
  });

  await t.test('class known + unknown fallback to association', () => {
    assert.equal(classLink('inheritance'), '<|--');
    assert.equal(classLink('composition'), '*--');
    assert.equal(classLink('weird'), classLink('association'));
  });

  await t.test('er cardinality + identifying swaps -- for ..', () => {
    assert.equal(erLink('one-to-many', true), '||--o{');
    assert.equal(erLink('one-to-many', false), '||..o{');
    assert.equal(erLink('mystery', true), erLink('one-to-many', true));
  });
});
