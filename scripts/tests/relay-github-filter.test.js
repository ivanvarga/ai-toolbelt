const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { shouldRelayGithub } = require('../tb-triage/relay-filters');

function fixture(name) {
  return require(path.join(__dirname, 'fixtures', name));
}

test('relay-github-filter', async (t) => {
  await t.test('issues.assigned with matching login relays', () => {
    const payload = fixture('github-issues-assigned.json');
    const r = shouldRelayGithub('issues', payload, { triageUserLogin: 'ivan' });
    assert.equal(r.relay, true);
    assert.equal(r.dedupKey, 'gh:acme/repo#42');
  });

  await t.test('issues.assigned with non-matching login does not relay', () => {
    const payload = fixture('github-issues-assigned.json');
    const r = shouldRelayGithub('issues', payload, { triageUserLogin: 'other' });
    assert.equal(r.relay, false);
    assert.equal(r.reason, 'assignee mismatch');
  });

  await t.test('issues.labeled with triage:oneshot relays as tag override', () => {
    const payload = fixture('github-issues-labeled-triage-oneshot.json');
    const r = shouldRelayGithub('issues', payload, { triageUserLogin: 'ivan' });
    assert.equal(r.relay, true);
    assert.match(r.reason, /tag override: oneshot/);
  });

  await t.test('issues.opened does not relay', () => {
    const r = shouldRelayGithub(
      'issues',
      { action: 'opened', issue: { number: 1, labels: [] }, repository: { full_name: 'acme/repo' } },
      { triageUserLogin: 'ivan' }
    );
    assert.equal(r.relay, false);
  });

  await t.test('pull_request.closed merged relays as cleanup', () => {
    const payload = fixture('github-pr-closed-merged.json');
    const r = shouldRelayGithub('pull_request', payload, { triageUserLogin: 'ivan' });
    assert.equal(r.relay, true);
    assert.equal(r.reason, 'pr merged cleanup');
  });
});
