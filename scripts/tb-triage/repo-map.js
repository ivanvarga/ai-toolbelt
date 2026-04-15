const fs = require('node:fs');
const path = require('node:path');
const { repoMapFile } = require('./paths');

function normalizeGithubUrl(url) {
  if (!url) return null;
  let u = String(url).trim().toLowerCase();
  u = u.replace(/^git@github\.com:/, 'https://github.com/');
  u = u.replace(/\.git$/, '');
  u = u.replace(/\/$/, '');
  return u;
}

function readCache() {
  const f = repoMapFile();
  if (!fs.existsSync(f)) { fs.writeFileSync(f, '{}', { mode: 0o600 }); return {}; }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function writeCache(data) {
  fs.writeFileSync(repoMapFile(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

function validateCwd(cwd) {
  if (!cwd || typeof cwd !== 'string') return false;
  if (!path.isAbsolute(cwd)) return false;
  if (!fs.existsSync(cwd)) return false;
  if (!fs.existsSync(path.join(cwd, '.git'))) return false;
  return true;
}

function getCache() { return readCache(); }

function setCache(key, cwd) {
  if (!validateCwd(cwd)) throw new Error(`invalid cwd for repo-map: ${cwd}`);
  const data = readCache();
  data[key] = cwd;
  writeCache(data);
}

async function resolve(ticket, paperclipClient) {
  let key;
  let expectedUrl = null;
  if (ticket.source === 'gh') {
    key = `gh:${ticket.owner}/${ticket.repo}`;
    expectedUrl = normalizeGithubUrl(`https://github.com/${ticket.owner}/${ticket.repo}`);
  } else if (ticket.source === 'jira') {
    key = `jira:${ticket.project}`;
  } else {
    throw new Error(`unknown source: ${ticket.source}`);
  }

  const cache = readCache();
  if (cache[key] && validateCwd(cache[key])) {
    return { cwd: cache[key], cached: true };
  }

  if (ticket.source === 'gh' && paperclipClient && typeof paperclipClient.listProjects === 'function') {
    const { projects } = await paperclipClient.listProjects();
    for (const proj of projects || []) {
      for (const ws of proj.workspaces || []) {
        if (normalizeGithubUrl(ws.repoUrl) === expectedUrl && validateCwd(ws.cwd)) {
          setCache(key, ws.cwd);
          return { cwd: ws.cwd, cached: false };
        }
      }
    }
  }

  return null;
}

module.exports = { resolve, setCache, getCache, normalizeGithubUrl };

if (require.main === module) {
  const [, , cmd, ...rest] = process.argv;
  if (cmd !== 'resolve') { console.error('usage: repo-map.js resolve --source=<gh|jira> [--owner=X --repo=Y | --project=KEY]'); process.exit(2); }
  const opts = Object.fromEntries(rest.map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }));
  (async () => {
    let client = null;
    try {
      const { listProjects } = require('./relay-paperclip-client');
      if (opts['source'] === 'gh' && process.env.PAPERCLIP_API_BASE && process.env.PAPERCLIP_API_KEY && process.env.PAPERCLIP_COMPANY_ID) {
        client = { listProjects: () => listProjects({ apiBase: process.env.PAPERCLIP_API_BASE, apiKey: process.env.PAPERCLIP_API_KEY, companyId: process.env.PAPERCLIP_COMPANY_ID }) };
      }
    } catch { }
    const result = await resolve(opts, client);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result ? 0 : 1);
  })().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
}
