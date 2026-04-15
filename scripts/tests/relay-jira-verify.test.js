const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyJiraSignature } = require('../tb-triage/relay-filters');

const SECRET = 'jira-test-secret';

function sign(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

test('relay-jira-verify', async (t) => {
  await t.test('valid signature verifies', () => {
    const body = JSON.stringify({ webhookEvent: 'jira:issue_updated' });
    const header = sign(body, SECRET);
    assert.equal(verifyJiraSignature(body, header, SECRET), true);
  });

  await t.test('tampered body fails', () => {
    const body = JSON.stringify({ webhookEvent: 'jira:issue_updated' });
    const header = sign(body, SECRET);
    const tampered = body + ' ';
    assert.equal(verifyJiraSignature(tampered, header, SECRET), false);
  });

  await t.test('missing or malformed header fails', () => {
    const body = JSON.stringify({ webhookEvent: 'jira:issue_updated' });
    assert.equal(verifyJiraSignature(body, undefined, SECRET), false);
    assert.equal(verifyJiraSignature(body, 'sha1=abc', SECRET), false);
    assert.equal(verifyJiraSignature(body, 'sha256=', SECRET), false);
  });
});
