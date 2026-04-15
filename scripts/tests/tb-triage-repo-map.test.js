const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function withTempHomeAndRepo(fn) {
  return async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-triage-home-'));
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-fake-repo-'));
    fs.mkdirSync(path.join(repo, '.git'));
    const origHome = process.env.HOME;
    process.env.HOME = home;
    for (const m of ['../tb-triage/paths', '../tb-triage/repo-map']) {
      delete require.cache[require.resolve(m)];
    }
    try { await fn({ repo }); } finally {
      process.env.HOME = origHome;
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(repo, { recursive: true, force: true });
    }
  };
}

test('repo-map', async (t) => {
  await t.test('URL normalization', () => {
    const { normalizeGithubUrl } = require('../tb-triage/repo-map');
    assert.equal(normalizeGithubUrl('https://github.com/acme/repo'), 'https://github.com/acme/repo');
    assert.equal(normalizeGithubUrl('https://github.com/acme/repo.git'), 'https://github.com/acme/repo');
    assert.equal(normalizeGithubUrl('git@github.com:acme/repo.git'), 'https://github.com/acme/repo');
    assert.equal(normalizeGithubUrl('https://GitHub.com/Acme/Repo/'), 'https://github.com/acme/repo');
  });

  await t.test('cache hit bypasses Paperclip', withTempHomeAndRepo(async ({ repo }) => {
    const rm = require('../tb-triage/repo-map');
    rm.setCache('gh:acme/lfcr-app', repo);
    let called = false;
    const fake = { listProjects: async () => { called = true; return { projects: [] }; } };
    const result = await rm.resolve({ source: 'gh', owner: 'acme', repo: 'lfcr-app' }, fake);
    assert.equal(result.cwd, repo);
    assert.equal(result.cached, true);
    assert.equal(called, false);
  }));

  await t.test('autoresolve from Paperclip workspaces, writes cache', withTempHomeAndRepo(async ({ repo }) => {
    const rm = require('../tb-triage/repo-map');
    const fake = {
      listProjects: async () => ({
        projects: [{ id: 'p1', workspaces: [{ cwd: repo, repoUrl: 'https://github.com/acme/lfcr-app.git' }] }],
      }),
    };
    const result = await rm.resolve({ source: 'gh', owner: 'acme', repo: 'lfcr-app' }, fake);
    assert.equal(result.cwd, repo);
    assert.equal(result.cached, false);
    const cache = rm.getCache();
    assert.equal(cache['gh:acme/lfcr-app'], repo);
  }));

  await t.test('returns null on Jira cache miss (no autoresolve path)', withTempHomeAndRepo(async () => {
    const rm = require('../tb-triage/repo-map');
    const fake = { listProjects: async () => ({ projects: [] }) };
    const result = await rm.resolve({ source: 'jira', project: 'LFCR' }, fake);
    assert.equal(result, null);
  }));

  await t.test('rejects invalid cwd in setCache', withTempHomeAndRepo(async () => {
    const rm = require('../tb-triage/repo-map');
    assert.throws(() => rm.setCache('gh:bad/repo', '/nonexistent/path'), /invalid cwd/);
    assert.throws(() => rm.setCache('gh:bad/repo', 'relative/path'), /invalid cwd/);
  }));

  await t.test('parseCliFlags — equals form', () => {
    const { parseCliFlags } = require('../tb-triage/repo-map');
    assert.deepEqual(
      parseCliFlags(['--source=gh', '--owner=acme', '--repo=lfcr']),
      { source: 'gh', owner: 'acme', repo: 'lfcr' }
    );
  });

  await t.test('parseCliFlags — space-separated form', () => {
    const { parseCliFlags } = require('../tb-triage/repo-map');
    assert.deepEqual(
      parseCliFlags(['--source', 'gh', '--owner', 'acme', '--repo', 'lfcr']),
      { source: 'gh', owner: 'acme', repo: 'lfcr' }
    );
  });

  await t.test('parseCliFlags — mixed equals and space forms', () => {
    const { parseCliFlags } = require('../tb-triage/repo-map');
    assert.deepEqual(
      parseCliFlags(['--source=jira', '--project', 'LFCR']),
      { source: 'jira', project: 'LFCR' }
    );
  });

  await t.test('parseCliFlags — bare flag becomes true', () => {
    const { parseCliFlags } = require('../tb-triage/repo-map');
    assert.deepEqual(parseCliFlags(['--verbose']), { verbose: true });
  });
});
