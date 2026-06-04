const { test } = require('node:test');
const assert = require('node:assert/strict');

test('mermaid-style', async (t) => {
  const style = await import('../../skills/mermaid-render/scripts/lib/style.mjs');

  await t.test('classDefLines covers new/modified/deleted with #000 text', () => {
    const out = style.classDefLines().join('\n');
    assert.match(out, /classDef new fill:#4ade80/);
    assert.match(out, /classDef modified fill:#60a5fa/);
    assert.match(out, /classDef deleted fill:#f87171/);
    assert.match(out, /color:#000/);
  });

  await t.test('fence wraps body in a mermaid code block', () => {
    assert.equal(style.fence('X'), '```mermaid\nX\n```');
  });

  await t.test('linksComment emits a LINKS comment or null when empty', () => {
    assert.equal(style.linksComment({}), null);
    assert.match(style.linksComment({ a: 'http://x' }), /^<!-- LINKS: \{"a":"http:\/\/x"\} -->$/);
  });

  await t.test('escapeLabel neutralizes double quotes', () => {
    assert.equal(style.escapeLabel('say "hi"'), 'say &quot;hi&quot;');
  });
});
