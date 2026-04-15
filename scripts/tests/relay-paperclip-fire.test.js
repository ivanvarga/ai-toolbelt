const { test } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers/paperclip-mock');
const hmac = require('./helpers/hmac');
const { fireRoutine, listProjects, signPaperclip } = require('../tb-triage/relay-paperclip-client');

test('relay-paperclip-fire', async (t) => {
  await t.test('fires with valid X-Paperclip-Signature', async () => {
    const mock = await start(0);
    try {
      const result = await fireRoutine(
        'pub-1',
        { hello: 'world', dedupKey: 'gh:acme/repo#42' },
        {
          apiBase: `http://127.0.0.1:${mock.port}`,
          signingKey: 'test-secret',
        }
      );
      assert.equal(result.ok, true);
      assert.equal(result.runId, 'mock-run-1');

      const fire = mock.lastFire();
      assert.ok(fire, 'mock recorded a fire');
      assert.match(fire.signature, /^t=\d+,v1=[a-f0-9]{64}$/);
      assert.equal(hmac.verifyPaperclip(fire.body, fire.signature, 'test-secret'), true);

      const parsed = JSON.parse(fire.body);
      assert.equal(parsed.dedupKey, 'gh:acme/repo#42');
    } finally {
      await mock.stop();
    }
  });

  await t.test('throws on non-2xx from paperclip', async () => {
    await assert.rejects(
      () => fireRoutine('pub-1', {}, { apiBase: 'http://127.0.0.1:1', signingKey: 's' }),
      /paperclip fire|ECONNREFUSED|fetch failed/i
    );
  });

  await t.test('listProjects returns workspaces', async () => {
    const mock = await start(0);
    try {
      mock.setWorkspaces([{ name: 'w1', cwd: '/tmp/foo', repoUrl: 'https://github.com/acme/repo' }]);
      const result = await listProjects({
        apiBase: `http://127.0.0.1:${mock.port}`,
        apiKey: 'test-key',
        companyId: 'c1',
      });
      assert.equal(result.projects[0].workspaces[0].repoUrl, 'https://github.com/acme/repo');
    } finally {
      await mock.stop();
    }
  });

  await t.test('signPaperclip is deterministic for same inputs', () => {
    const a = signPaperclip(1715000000, 'body', 's');
    const b = signPaperclip(1715000000, 'body', 's');
    assert.equal(a, b);
  });
});
