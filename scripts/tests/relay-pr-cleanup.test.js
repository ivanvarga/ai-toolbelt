const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { signGithub } = require('./helpers/hmac');

const fixture = require('./fixtures/github-pr-closed-merged.json');

const KEYCHAIN = {
  github_webhook_secret: 'gh-secret',
  jira_webhook_secret: 'jira-secret',
  paperclip_webhook_signing_key: 'pc-sign',
  github_triage_user_login: 'ivan',
  jira_triage_user_accountid: 'abc123',
  paperclip_api_base: 'http://localhost:9',
  paperclip_api_key: 'pc-key',
  paperclip_company_id: 'cid',
  paperclip_triage_routine_github: 'gh-rt',
  paperclip_triage_routine_jira: 'jira-rt',
};

function resolver(name) { return KEYCHAIN[name] || null; }

function postJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

test('relay-pr-cleanup', async (t) => {
  await t.test('pull_request event dispatches to cleanup (not paperclip fire)', async () => {
    const rawBody = JSON.stringify(fixture);
    const sig = signGithub(rawBody, 'gh-secret');

    const { createServer } = require('../tb-triage/relay');
    const server = await createServer({ port: 0, keychainResolver: resolver });

    const pcClient = require('../tb-triage/relay-paperclip-client');
    const origFire = pcClient.fireRoutine;
    let fireCalled = false;
    pcClient.fireRoutine = async () => { fireCalled = true; return { ok: true, runId: 'should-not-happen' }; };

    try {
      const res = await postJson(`${server.url}/github`, rawBody, {
        'x-hub-signature-256': sig,
        'x-github-event': 'pull_request',
      });
      assert.equal(res.status, 200);
      assert.equal(fireCalled, false, 'paperclip.fireRoutine must NOT be called for pull_request events');
      assert.equal(typeof res.body, 'object');
      assert.ok('cleaned' in res.body, 'response must include cleaned field');
    } finally {
      pcClient.fireRoutine = origFire;
      await server.stop();
    }
  });
});
