const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync, mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const HTML = path.join(__dirname, '..', '..', 'skills', 'mermaid-render', 'scripts', 'html.mjs');

const nodes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }));
const BIG = {
  type: 'flowchart',
  groups: [
    { id: 'g1', label: 'first', nodeIds: nodes.slice(0, 15).map((n) => n.id) },
    { id: 'g2', label: 'second', nodeIds: nodes.slice(15).map((n) => n.id) },
  ],
  nodes,
  links: nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id })),
};

function run(input, title) {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'mh-')), 'v.html');
  const args = [HTML, '--out', out];
  if (title) args.push('--title', title);
  execFileSync('node', args, {
    input,
    encoding: 'utf8',
    env: { ...process.env, MERMAID_VIEW_NO_OPEN: '1' },
  });
  return readFileSync(out, 'utf8');
}

function embeddedSource(html) {
  const match = /<script type="application\/json" id="source">([\s\S]*?)<\/script>/.exec(html);
  return JSON.parse(match[1]);
}

test('mermaid-html', async (t) => {
  await t.test('renders a large JSON model as one un-split diagram', () => {
    const html = run(JSON.stringify(BIG), 'Big <flow>');
    const source = embeddedSource(html);
    assert.match(source, /^%%\{init[\s\S]*flowchart TD/);
    assert.match(source, /subgraph g1[\s\S]*subgraph g2/);
    assert.doesNotMatch(source, /Overview|```/);
    assert.match(html, /<title>Big &lt;flow&gt;<\/title>/);
  });

  await t.test('embeds the vendored mermaid library and no placeholders', () => {
    const html = run('flowchart TD\n  A --> B');
    assert.match(html, /mermaid/);
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
    assert.doesNotMatch(html, /src="https?:/);
  });

  await t.test('accepts raw Mermaid and the first fenced block of markdown', () => {
    assert.equal(embeddedSource(run('flowchart LR\n  A --> B\n')), 'flowchart LR\n  A --> B');
    const md = '# Plan\n\n```mermaid\nflowchart TD\n  X --> Y\n```\n\n```mermaid\nclassDiagram\n```\n';
    assert.equal(embeddedSource(run(md)), 'flowchart TD\n  X --> Y');
  });

  await t.test('keeps closing script tags in labels from breaking the page', () => {
    const html = run('flowchart TD\n  A["</script><b>x</b>"] --> B');
    assert.equal(embeddedSource(html), 'flowchart TD\n  A["</script><b>x</b>"] --> B');
  });
});
