const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { shouldRelayJira } = require('../tb-triage/relay-filters');

const TRIAGE_ACCOUNT_ID = 'my-accountid-placeholder';

function fixture(name) {
  return require(path.join(__dirname, 'fixtures', name));
}

test('relay-jira-filter', async (t) => {
  await t.test('assigned to configured accountId relays', () => {
    const payload = fixture('jira-issue-updated-assigned.json');
    const r = shouldRelayJira(payload, { triageUserAccountId: TRIAGE_ACCOUNT_ID });
    assert.equal(r.relay, true);
    assert.equal(r.dedupKey, 'jira:LFCR-360');
  });

  await t.test('assigned to other accountId does not relay', () => {
    const payload = fixture('jira-issue-updated-assigned.json');
    const r = shouldRelayJira(payload, { triageUserAccountId: 'someone-else' });
    assert.equal(r.relay, false);
  });

  await t.test('labeled with triage:oneshot relays as tag override', () => {
    const payload = fixture('jira-issue-labeled.json');
    const r = shouldRelayJira(payload, { triageUserAccountId: TRIAGE_ACCOUNT_ID });
    assert.equal(r.relay, true);
    assert.equal(r.dedupKey, 'jira:LFCR-361');
    assert.match(r.reason, /tag override: oneshot/);
  });
});
