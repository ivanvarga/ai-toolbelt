const { test } = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/github-pr-closed-merged.json');

function fakeStore(initial = {}) {
  let data = { ...initial };
  return {
    list: () => ({ ...data }),
    check: (k) => data[k] ?? null,
    insert: (k, v) => { data[k] = v; return v; },
    remove: (k) => { delete data[k]; },
  };
}

test('cleanup-on-merge', async (t) => {
  const { matchDedupKeyFromPr, removeWorktreeForPr } = require('../tb-triage/cleanup');

  await t.test('matchDedupKeyFromPr — prUrl strong match', () => {
    const entries = { 'gh:acme/repo#42': { prUrl: 'https://github.com/acme/repo/pull/99' } };
    assert.equal(matchDedupKeyFromPr(fixture, entries), 'gh:acme/repo#42');
  });

  await t.test('matchDedupKeyFromPr — head.ref branch match', () => {
    const entries = { 'gh:acme/repo#42': { worktreeName: 'gh-acme-repo-42' } };
    assert.equal(matchDedupKeyFromPr(fixture, entries), 'gh:acme/repo#42');
  });

  await t.test('matchDedupKeyFromPr — no match', () => {
    const entries = { 'gh:other/repo#1': { worktreeName: 'other' } };
    assert.equal(matchDedupKeyFromPr(fixture, entries), null);
  });

  await t.test('removeWorktreeForPr — happy path', async () => {
    const store = fakeStore({
      'gh:acme/repo#42': {
        paperclipIssueId: 'uuid-1',
        worktreeName: 'gh-acme-repo-42',
        worktreeCwd: '/Users/x/repos/acme-repo/.claude/worktrees/gh-acme-repo-42',
        prUrl: 'https://github.com/acme/repo/pull/99',
      }
    });
    let capturedArgs = null;
    const gitExec = async (args) => { capturedArgs = args; return { stdout: '', stderr: '' }; };
    const result = await removeWorktreeForPr(fixture, { dedupStore: store, gitExec });
    assert.equal(result.cleaned, true);
    assert.equal(result.worktreeName, 'gh-acme-repo-42');
    assert.deepEqual(capturedArgs, ['-C', '/Users/x/repos/acme-repo', 'worktree', 'remove', '--force', 'gh-acme-repo-42']);
    assert.equal(store.check('gh:acme/repo#42'), null);
  });

  await t.test('removeWorktreeForPr — no dedup match, entry intact', async () => {
    const store = fakeStore({ 'gh:other/repo#1': { worktreeName: 'other' } });
    const result = await removeWorktreeForPr(fixture, { dedupStore: store, gitExec: async () => {} });
    assert.equal(result.cleaned, false);
    assert.match(result.reason, /no dedup/);
    assert.ok(store.check('gh:other/repo#1'));
  });

  await t.test('removeWorktreeForPr — git failure, entry intact', async () => {
    const store = fakeStore({
      'gh:acme/repo#42': {
        worktreeName: 'gh-acme-repo-42',
        worktreeCwd: '/Users/x/repos/acme-repo/.claude/worktrees/gh-acme-repo-42',
        prUrl: 'https://github.com/acme/repo/pull/99',
      }
    });
    const gitExec = async () => { throw new Error('fatal: worktree is locked'); };
    const result = await removeWorktreeForPr(fixture, { dedupStore: store, gitExec });
    assert.equal(result.cleaned, false);
    assert.match(result.reason, /git worktree remove failed/);
    assert.match(result.error, /locked/);
    assert.ok(store.check('gh:acme/repo#42'));
  });

  await t.test('removeWorktreeForPr — malformed worktreeCwd rejected', async () => {
    const store = fakeStore({
      'gh:acme/repo#42': {
        worktreeName: 'gh-acme-repo-42',
        worktreeCwd: '/etc/passwd',
        prUrl: 'https://github.com/acme/repo/pull/99',
      }
    });
    const result = await removeWorktreeForPr(fixture, { dedupStore: store, gitExec: async () => { assert.fail('gitExec should not be called'); } });
    assert.equal(result.cleaned, false);
    assert.match(result.reason, /worktreeCwd not under/);
  });
});
