const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODEL = {
  type: 'class',
  nodes: [{
    id: 'AuthProvider', category: 'modified', url: 'http://x/auth',
    members: [
      { kind: 'field', name: 'token', type: 'string', visibility: '-' },
      { kind: 'method', name: 'login', type: 'Promise', visibility: '+' },
    ],
  }, { id: 'HttpClient', category: 'neutral', members: [] }],
  links: [{ from: 'AuthProvider', to: 'HttpClient', type: 'composition', label: 'uses' }],
};

test('mermaid-class', async (t) => {
  const { renderClass } = await import('../../skills/mermaid-render/scripts/renderers/class.mjs');
  const out = renderClass(MODEL);

  await t.test('classDiagram header + class block with members', () => {
    assert.match(out, /classDiagram/);
    assert.match(out, /class AuthProvider\{/);
    assert.match(out, /-token string/);
    assert.match(out, /\+login\(\) Promise/);
  });
  await t.test('composition relation with label', () => {
    assert.match(out, /AuthProvider \*-- HttpClient : uses/);
  });
  await t.test('category via classDef + cssClass', () => {
    assert.match(out, /classDef modified fill:#60a5fa/);
    assert.match(out, /cssClass "AuthProvider" modified/);
  });
  await t.test('click href + LINKS comment for url', () => {
    assert.match(out, /click AuthProvider href "http:\/\/x\/auth"/);
    assert.match(out, /<!-- LINKS: \{"AuthProvider":"http:\/\/x\/auth"\} -->/);
  });
});
