const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const hmac = require('./helpers/hmac.js');
const dedup = require('./helpers/dedup-store.js');

const FIXTURES = [
  'github-issues-assigned.json',
  'github-issues-labeled-triage-oneshot.json',
  'github-pr-closed-merged.json',
  'jira-issue-updated-assigned.json',
  'jira-issue-labeled.json',
];

test('scaffold', async (t) => {
  await t.test('5 fixtures parse as JSON', () => {
    for (const f of FIXTURES) {
      const raw = fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');
      assert.doesNotThrow(() => JSON.parse(raw), `${f} should parse`);
    }
  });

  await t.test('hmac round-trip GitHub', () => {
    const sig = hmac.signGithub('payload', 'secret');
    assert.equal(hmac.verifyGithub('payload', sig, 'secret'), true);
    assert.equal(hmac.verifyGithub('tampered', sig, 'secret'), false);
  });

  await t.test('hmac round-trip Paperclip', () => {
    const now = Math.floor(Date.now() / 1000);
    const sig = hmac.signPaperclip(now, 'payload', 'secret');
    assert.equal(hmac.verifyPaperclip('payload', sig, 'secret'), true);
  });

  await t.test('dedup-store insert/check/remove', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-triage-test-'));
    try {
      const store = dedup.createStore(dir);
      dedup.insert(store, 'gh:acme/repo#42', 'issue-uuid-1');
      assert.equal(dedup.check(store, 'gh:acme/repo#42'), 'issue-uuid-1');
      dedup.remove(store, 'gh:acme/repo#42');
      assert.equal(dedup.check(store, 'gh:acme/repo#42'), null);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
