const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const dedup = require('./dedup-store');

const pExecFile = promisify(execFile);

function matchDedupKeyFromPr(payload, entries) {
  const prUrl = payload?.pull_request?.html_url;
  const headRef = payload?.pull_request?.head?.ref;
  const fullName = payload?.repository?.full_name;

  if (prUrl) {
    for (const [key, entry] of Object.entries(entries)) {
      if (entry?.prUrl === prUrl) return key;
    }
  }

  if (headRef && headRef.startsWith('worktree-gh-') && fullName) {
    const expectedPrefix = `gh:${fullName}#`;
    for (const [key, entry] of Object.entries(entries)) {
      if (key.startsWith(expectedPrefix) && entry?.worktreeName && headRef === `worktree-${entry.worktreeName}`) {
        return key;
      }
    }
  }

  return null;
}

async function removeWorktreeForPr(payload, options = {}) {
  const dedupStore = options.dedupStore || dedup;
  const gitExec = options.gitExec || (async (args, opts) => pExecFile('git', args, opts));

  const entries = dedupStore.list();
  const key = matchDedupKeyFromPr(payload, entries);
  if (!key) {
    return { cleaned: false, reason: 'no dedup entry matches pr' };
  }

  const entry = entries[key];
  if (!entry?.worktreeCwd || !entry?.worktreeName) {
    dedupStore.remove(key);
    return { cleaned: true, key, worktreeName: null, reason: 'dedup entry had no worktree; removed entry only' };
  }

  const parentRepo = entry.worktreeCwd.replace(/\/\.claude\/worktrees\/[^/]+\/?$/, '');
  if (parentRepo === entry.worktreeCwd) {
    return { cleaned: false, reason: 'worktreeCwd not under .claude/worktrees/', key };
  }

  try {
    await gitExec(['-C', parentRepo, 'worktree', 'remove', '--force', entry.worktreeName]);
  } catch (err) {
    return { cleaned: false, reason: 'git worktree remove failed', error: err.message, key };
  }

  dedupStore.remove(key);
  return { cleaned: true, key, worktreeName: entry.worktreeName };
}

module.exports = { matchDedupKeyFromPr, removeWorktreeForPr };
