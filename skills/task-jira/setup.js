#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const checks = [
  { cmd: 'which acli', failMsg: 'acli is not installed. Install via Homebrew: brew install acli' },
  { cmd: 'acli jira workitem view --help', failMsg: 'acli is installed but may not be authenticated. Run: acli login' }
];

for (const check of checks) {
  try {
    execSync(check.cmd, { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    console.error(check.failMsg);
    process.exit(1);
  }
}
console.log('acli (Atlassian CLI) is installed and configured.');

try {
  execSync(`node "${path.join(__dirname, '../../scripts/resolve-credential.js')}" tb.jira-token`, { stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('Jira API token configured.');
} catch {
  console.error('Jira API token missing (needed for attachment downloads). Run: node ' + path.join(__dirname, 'setup-token.js'));
  process.exit(1);
}
