const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyGithubSignature } = require('../tb-triage/relay-filters');

const SECRET = 'gh-test-secret';

function sign(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

test('relay-github-verify', async (t) => {
  await t.test('valid signature verifies', () => {
    const body = JSON.stringify({ action: 'assigned' });
    const header = sign(body, SECRET);
    assert.equal(verifyGithubSignature(body, header, SECRET), true);
  });

  await t.test('tampered body fails', () => {
    const body = JSON.stringify({ action: 'assigned' });
    const header = sign(body, SECRET);
    const tampered = body.replace('assigned', 'opened');
    assert.equal(verifyGithubSignature(tampered, header, SECRET), false);
  });

  await t.test('missing or malformed header fails', () => {
    const body = JSON.stringify({ action: 'assigned' });
    assert.equal(verifyGithubSignature(body, undefined, SECRET), false);
    assert.equal(verifyGithubSignature(body, '', SECRET), false);
    assert.equal(verifyGithubSignature(body, 'not-a-signature', SECRET), false);
    assert.equal(verifyGithubSignature(body, 'sha256=deadbeef', SECRET), false);
  });
});
