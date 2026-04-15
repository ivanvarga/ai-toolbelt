const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function withTempHome(fn) {
  return () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-triage-home-'));
    const origHome = process.env.HOME;
    process.env.HOME = dir;
    delete require.cache[require.resolve('../tb-triage/paths')];
    delete require.cache[require.resolve('../tb-triage/dedup-store')];
    try { fn(); } finally {
      process.env.HOME = origHome;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

test('dedup-store', async (t) => {
  await t.test('initializes empty store on first use', withTempHome(() => {
    const store = require('../tb-triage/dedup-store');
    assert.equal(store.check('gh:acme/repo#42'), null);
  }));

  await t.test('insert is idempotent', withTempHome(() => {
    const store = require('../tb-triage/dedup-store');
    const v1 = store.insert('gh:acme/repo#42', { paperclipIssueId: 'uuid-1' });
    const v2 = store.insert('gh:acme/repo#42', { paperclipIssueId: 'uuid-2' });
    assert.equal(v1.paperclipIssueId, 'uuid-1');
    assert.equal(v2.paperclipIssueId, 'uuid-1');
  }));

  await t.test('remove works', withTempHome(() => {
    const store = require('../tb-triage/dedup-store');
    store.insert('jira:LFCR-360', { paperclipIssueId: 'jira-uuid' });
    assert.equal(store.check('jira:LFCR-360').paperclipIssueId, 'jira-uuid');
    store.remove('jira:LFCR-360');
    assert.equal(store.check('jira:LFCR-360'), null);
  }));

  await t.test('rejects invalid keys', withTempHome(() => {
    const store = require('../tb-triage/dedup-store');
    assert.throws(() => store.insert('../etc/passwd', {}), /invalid dedup key/);
    assert.throws(() => store.insert('gh:acme/repo', {}), /invalid dedup key/);
    assert.throws(() => store.check('random-junk'), /invalid dedup key/);
  }));
});
