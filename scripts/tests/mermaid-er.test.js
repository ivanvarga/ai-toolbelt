const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODEL = {
  type: 'er',
  nodes: [
    { id: 'PERSON', category: 'new', attributes: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'companyId', type: 'uuid', key: 'FK' },
      { name: 'email', type: 'string', key: null },
    ] },
    { id: 'COMPANY', category: 'neutral', attributes: [{ name: 'id', type: 'uuid', key: 'PK' }] },
  ],
  links: [{ from: 'PERSON', to: 'COMPANY', type: 'many-to-one', label: 'works at', identifying: false }],
};

test('mermaid-er', async (t) => {
  const { renderEr } = await import('../../skills/mermaid-render/scripts/renderers/er.mjs');
  const out = renderEr(MODEL);

  await t.test('erDiagram header + entity attributes with keys', () => {
    assert.match(out, /erDiagram/);
    assert.match(out, /PERSON \{/);
    assert.match(out, /uuid id PK/);
    assert.match(out, /uuid companyId FK/);
    assert.match(out, /string email/);
  });
  await t.test('non-identifying many-to-one crow-foot with label', () => {
    assert.match(out, /PERSON \}o\.\.\|\| COMPANY : "works at"/);
  });
  await t.test('category via classDef + :::class, no click', () => {
    assert.match(out, /classDef new fill:#4ade80/);
    assert.match(out, /PERSON:::new/);
    assert.doesNotMatch(out, /click /);
  });
});
