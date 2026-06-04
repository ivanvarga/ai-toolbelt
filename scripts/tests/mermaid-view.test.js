const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync, mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const VIEW = path.join(__dirname, '..', '..', 'skills', 'mermaid-render', 'scripts', 'view.mjs');
const MODEL = { type: 'flowchart', nodes: [{ id: 'a', label: 'A' }], links: [] };

test('mermaid-view', async (t) => {
  await t.test('writes a markdown file with title + mermaid, skips cmux when told', () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'mv-')), 'v.md');
    execFileSync('node', [VIEW, '--out', out, '--title', 'My Diagram'], {
      input: JSON.stringify(MODEL),
      encoding: 'utf8',
      env: { ...process.env, MERMAID_VIEW_NO_OPEN: '1' },
    });
    const md = readFileSync(out, 'utf8');
    assert.match(md, /^# My Diagram/);
    assert.match(md, /```mermaid[\s\S]*flowchart/);
  });
});
