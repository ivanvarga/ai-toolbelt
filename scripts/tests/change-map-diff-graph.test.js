const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', '..', 'skills', 'change-map', 'scripts', 'diff-graph.mjs');

function git(cwd, args) { execFileSync('git', args, { cwd, encoding: 'utf8' }); }

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cm-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 't@t']);
  git(dir, ['config', 'user.name', 't']);
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  git(dir, ['add', '.']); git(dir, ['commit', '-qm', 'base']);
  git(dir, ['branch', '-q', 'origin/main']);
  writeFileSync(path.join(dir, 'src', 'b.ts'), "import { a } from './a';\nexport const b = a + 1;\n");
  git(dir, ['add', '.']); git(dir, ['commit', '-qm', 'add b']);
  return dir;
}

test('change-map-diff-graph', async (t) => {
  const dir = makeRepo();
  const out = execFileSync('node', [SCRIPT, 'origin/main'], { cwd: dir, encoding: 'utf8' });
  const model = JSON.parse(out);

  await t.test('emits a flowchart model with nodes', () => {
    assert.equal(model.type, 'flowchart');
    assert.ok(model.nodes.some((n) => /b\.ts/.test(n.label)));
  });
  await t.test('new file node has category new', () => {
    const bNode = model.nodes.find((n) => /b\.ts/.test(n.label));
    assert.equal(bNode.category, 'new');
  });
});
