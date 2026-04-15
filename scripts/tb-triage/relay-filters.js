const crypto = require('node:crypto');
const { KEY_PATTERN } = require('./dedup-store');

const TAG_VOCAB = { 'triage:oneshot': 'oneshot', 'triage:process': 'process', 'triage:skip': 'skip' };
const TAG_PRIORITY = ['triage:skip', 'triage:oneshot', 'triage:process'];

function verifyGithubSignature(rawBody, header, secret) {
  if (!header || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(header);
  if (expectedBuf.length !== headerBuf.length) return false;
  try {
    return crypto.timingSafeEqual(expectedBuf, headerBuf);
  } catch {
    return false;
  }
}

function verifyJiraSignature(rawBody, header, secret) {
  return verifyGithubSignature(rawBody, header, secret);
}

function extractTriageTag(labels) {
  if (!Array.isArray(labels)) return null;
  const names = new Set(
    labels
      .map((l) => (typeof l === 'string' ? l : l?.name))
      .filter(Boolean)
  );
  for (const tag of TAG_PRIORITY) {
    if (names.has(tag)) return TAG_VOCAB[tag];
  }
  return null;
}

function buildDedupKey(event, payload) {
  if (event === 'issues' && payload?.repository?.full_name && payload?.issue?.number != null) {
    const key = `gh:${payload.repository.full_name}#${payload.issue.number}`;
    if (!KEY_PATTERN.test(key)) throw new Error(`built invalid dedup key: ${key}`);
    return key;
  }
  if (event === 'jira:issue_updated' && payload?.issue?.key) {
    const key = `jira:${payload.issue.key}`;
    if (!KEY_PATTERN.test(key)) throw new Error(`built invalid dedup key: ${key}`);
    return key;
  }
  throw new Error(`cannot build dedup key for event ${event}`);
}

function shouldRelayGithub(event, payload, config) {
  if (event === 'pull_request') {
    if (payload?.action === 'closed' && payload?.pull_request?.merged === true) {
      return { relay: true, reason: 'pr merged cleanup', dedupKey: null };
    }
    return { relay: false, reason: 'pr action not cleanup-relevant' };
  }
  if (event !== 'issues') return { relay: false, reason: `unsupported event: ${event}` };

  const action = payload?.action;
  const assigneeLogin = payload?.assignee?.login || payload?.issue?.assignee?.login;

  if (action === 'assigned') {
    if (assigneeLogin !== config.triageUserLogin) {
      return { relay: false, reason: 'assignee mismatch' };
    }
    return { relay: true, reason: 'issues.assigned to ' + assigneeLogin, dedupKey: buildDedupKey('issues', payload) };
  }

  if (action === 'labeled') {
    const tag = extractTriageTag(payload?.issue?.labels || []);
    if (!tag) return { relay: false, reason: 'label not in triage vocabulary' };
    return { relay: true, reason: `tag override: ${tag}`, dedupKey: buildDedupKey('issues', payload) };
  }

  return { relay: false, reason: 'action not triaged' };
}

function shouldRelayJira(payload, config) {
  if (payload?.webhookEvent !== 'jira:issue_updated') {
    return { relay: false, reason: `unsupported jira event: ${payload?.webhookEvent}` };
  }

  const items = payload?.changelog?.items || [];

  const labelItem = items.find((i) => i.field === 'labels');
  if (labelItem) {
    const tag = extractTriageTag(payload?.issue?.fields?.labels || []);
    if (tag) return { relay: true, reason: `tag override: ${tag}`, dedupKey: buildDedupKey('jira:issue_updated', payload) };
  }

  const assigneeChange = items.find((i) => i.field === 'assignee' && i.to === config.triageUserAccountId);
  if (assigneeChange) {
    return { relay: true, reason: 'assignee changelog matches', dedupKey: buildDedupKey('jira:issue_updated', payload) };
  }

  return { relay: false, reason: 'no assignee change in changelog' };
}

module.exports = {
  verifyGithubSignature,
  verifyJiraSignature,
  extractTriageTag,
  buildDedupKey,
  shouldRelayGithub,
  shouldRelayJira,
  TAG_VOCAB,
};
