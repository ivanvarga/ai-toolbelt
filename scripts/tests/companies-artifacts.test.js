const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', 'companies', 'triage-shop');

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

test('companies-artifacts', async (t) => {
  await t.test('COMPANY.md has v1-draft schema and triage-shop slug', () => {
    const s = read('COMPANY.md');
    assert.match(s, /schema:\s*agentcompanies\/v1/);
    assert.match(s, /slug:\s*triage-shop/);
  });

  await t.test('.paperclip.yaml has 3 claude_local agents and 2 webhook routines', () => {
    const s = read('.paperclip.yaml');
    assert.equal((s.match(/type:\s*claude_local/g) || []).length, 3);
    assert.match(s, /intake-github:/);
    assert.match(s, /intake-jira:/);
    assert.match(s, /kind:\s*webhook/);
    assert.match(s, /signingMode:\s*hmac_sha256/);
  });

  await t.test('.paperclip.yaml has no inline secret values', () => {
    const s = read('.paperclip.yaml');
    for (const line of s.split('\n')) {
      if (/^\s*value:\s*\S/.test(line)) {
        assert.fail(`inline secret value found: ${line}`);
      }
    }
  });

  await t.test('3 agent packages exist', () => {
    for (const slug of ['triage', 'oneshot-coder', 'gsd-orchestrator']) {
      assert.ok(fs.existsSync(path.join(ROOT, 'agents', slug, 'AGENTS.md')), `${slug}/AGENTS.md`);
      assert.ok(fs.existsSync(path.join(ROOT, 'agents', slug, 'SOUL.md')), `${slug}/SOUL.md`);
    }
  });

  await t.test('triage AGENTS.md references full D-25 tag vocabulary + D-26 labels', () => {
    const s = read('agents/triage/AGENTS.md');
    for (const tag of ['triage:oneshot', 'triage:process', 'triage:skip']) {
      assert.match(s, new RegExp(tag), `tag ${tag} present`);
    }
    for (const label of ['low', 'med', 'high']) {
      assert.match(s, new RegExp(`\\b${label}\\b`), `label ${label} present`);
    }
    assert.match(s, /understanding/i);
    assert.match(s, /solution/i);
    assert.match(s, /code[- ]?trace/i);
  });

  await t.test('triage AGENTS.md has untrusted-content warning (prompt injection mitigation)', () => {
    assert.match(read('agents/triage/AGENTS.md'), /untrusted/i);
  });

  await t.test('oneshot-coder AGENTS.md references tb:pr-submit and tb:pr-describe', () => {
    const s = read('agents/oneshot-coder/AGENTS.md');
    assert.match(s, /tb:pr-submit/);
    assert.match(s, /tb:pr-describe/);
    assert.match(s, /changes_requested/);
  });

  await t.test('gsd-orchestrator AGENTS.md references gsd workflow', () => {
    const s = read('agents/gsd-orchestrator/AGENTS.md');
    assert.match(s, /gsd/i);
    assert.match(s, /autonomous/i);
  });

  await t.test('all 3 SOUL.md files have principles + uncertainty sections', () => {
    for (const slug of ['triage', 'oneshot-coder', 'gsd-orchestrator']) {
      const s = read(`agents/${slug}/SOUL.md`);
      assert.match(s, /principles/i);
      assert.match(s, /uncertainty/i);
    }
  });

  await t.test('all 3 AGENTS.md reference decision.json (D-21 telemetry)', () => {
    for (const slug of ['triage', 'oneshot-coder', 'gsd-orchestrator']) {
      const s = read(`agents/${slug}/AGENTS.md`);
      assert.match(s, /decision\.json/);
    }
  });
});
