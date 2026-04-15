const http = require('node:http');
const { URL } = require('node:url');
const filters = require('./relay-filters');
const paperclip = require('./relay-paperclip-client');
const dedup = require('./dedup-store');
const cleanup = require('./cleanup');

const MAX_BODY = 1 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('body too large'), { code: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function log(obj) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n');
}

function reply(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function buildConfig(resolver) {
  const get = (name) => {
    const v = resolver(name);
    if (!v) throw new Error(`missing credential: ${name}`);
    return v;
  };
  return {
    githubSecret: get('github_webhook_secret'),
    jiraSecret: get('jira_webhook_secret'),
    paperclipSigningKey: get('paperclip_webhook_signing_key'),
    triageUserLogin: get('github_triage_user_login'),
    triageUserAccountId: get('jira_triage_user_accountid'),
    paperclipApiBase: get('paperclip_api_base'),
    paperclipApiKey: get('paperclip_api_key'),
    paperclipCompanyId: get('paperclip_company_id'),
    routineGithub: get('paperclip_triage_routine_github'),
    routineJira: get('paperclip_triage_routine_jira'),
  };
}

async function handleGithub(req, res, config) {
  const rawBody = await readBody(req);
  const sig = req.headers['x-hub-signature-256'];
  if (!filters.verifyGithubSignature(rawBody, sig, config.githubSecret)) {
    log({ route: 'github', status: 401, reason: 'bad signature' });
    return reply(res, 401, { error: 'bad signature' });
  }
  const event = req.headers['x-github-event'] || 'unknown';
  const payload = JSON.parse(rawBody);
  const decision = filters.shouldRelayGithub(event, payload, { triageUserLogin: config.triageUserLogin });

  if (!decision.relay) {
    log({ route: 'github', event, relay: false, reason: decision.reason, status: 200 });
    return reply(res, 200, { ok: true, relayed: false, reason: decision.reason });
  }

  if (event === 'pull_request') {
    try {
      const result = await cleanup.removeWorktreeForPr(payload);
      log({ route: 'github', event, cleaned: result.cleaned, dedupKey: result.key || null, status: 200 });
      return reply(res, 200, { ok: true, cleaned: result.cleaned, key: result.key || null, reason: result.reason });
    } catch (err) {
      log({ route: 'github', event, status: 500, error: err.message });
      return reply(res, 500, { error: 'cleanup failed' });
    }
  }

  if (decision.dedupKey) {
    const existing = dedup.check(decision.dedupKey);
    if (existing) {
      log({ route: 'github', event, relay: false, reason: 'dedup hit', dedupKey: decision.dedupKey, status: 200 });
      return reply(res, 200, { ok: true, relayed: false, reason: 'dedup hit', issueId: existing.paperclipIssueId });
    }
  }

  try {
    const result = await paperclip.fireRoutine(
      config.routineGithub,
      {
        source: 'github',
        event,
        dedupKey: decision.dedupKey,
        reason: decision.reason,
        payload,
      },
      { apiBase: config.paperclipApiBase, signingKey: config.paperclipSigningKey }
    );

    if (decision.dedupKey) {
      dedup.insert(decision.dedupKey, {
        paperclipIssueId: result.runId,
        source: 'github',
        createdAt: new Date().toISOString(),
      });
    }

    log({ route: 'github', event, relay: true, dedupKey: decision.dedupKey, status: 200 });
    return reply(res, 200, { ok: true, relayed: true, runId: result.runId });
  } catch (err) {
    log({ route: 'github', event, relay: true, status: 502, error: err.message });
    return reply(res, 502, { error: 'paperclip fire failed' });
  }
}

async function handleJira(req, res, config) {
  const rawBody = await readBody(req);
  const sig = req.headers['x-hub-signature'];
  if (!filters.verifyJiraSignature(rawBody, sig, config.jiraSecret)) {
    log({ route: 'jira', status: 401, reason: 'bad signature' });
    return reply(res, 401, { error: 'bad signature' });
  }
  const payload = JSON.parse(rawBody);
  const decision = filters.shouldRelayJira(payload, { triageUserAccountId: config.triageUserAccountId });

  if (!decision.relay) {
    log({ route: 'jira', relay: false, reason: decision.reason, status: 200 });
    return reply(res, 200, { ok: true, relayed: false, reason: decision.reason });
  }

  if (decision.dedupKey) {
    const existing = dedup.check(decision.dedupKey);
    if (existing) {
      log({ route: 'jira', relay: false, reason: 'dedup hit', dedupKey: decision.dedupKey, status: 200 });
      return reply(res, 200, { ok: true, relayed: false, reason: 'dedup hit', issueId: existing.paperclipIssueId });
    }
  }

  try {
    const result = await paperclip.fireRoutine(
      config.routineJira,
      {
        source: 'jira',
        dedupKey: decision.dedupKey,
        reason: decision.reason,
        payload,
      },
      { apiBase: config.paperclipApiBase, signingKey: config.paperclipSigningKey }
    );

    if (decision.dedupKey) {
      dedup.insert(decision.dedupKey, {
        paperclipIssueId: result.runId,
        source: 'jira',
        createdAt: new Date().toISOString(),
      });
    }

    log({ route: 'jira', relay: true, dedupKey: decision.dedupKey, status: 200 });
    return reply(res, 200, { ok: true, relayed: true, runId: result.runId });
  } catch (err) {
    log({ route: 'jira', relay: true, status: 502, error: err.message });
    return reply(res, 502, { error: 'paperclip fire failed' });
  }
}

async function handleRequest(req, res, config) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'method not allowed' });

  const ctype = req.headers['content-type'] || '';
  if (!ctype.startsWith('application/json')) return reply(res, 415, { error: 'content-type must be application/json' });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/github') return await handleGithub(req, res, config);
    if (url.pathname === '/jira') return await handleJira(req, res, config);
    return reply(res, 404, { error: 'not found' });
  } catch (err) {
    if (err.code === 413) return reply(res, 413, { error: 'body too large' });
    log({ route: url.pathname, status: 500, error: err.message });
    return reply(res, 500, { error: 'internal error' });
  }
}

function createServer({ port = 0, keychainResolver }) {
  const config = buildConfig(keychainResolver);
  const server = http.createServer((req, res) => handleRequest(req, res, config).catch(() => {}));
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        url: `http://127.0.0.1:${addr.port}`,
        stop: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

module.exports = { createServer, handleRequest, buildConfig };
