#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const resolveOrg = require('./resolve-org');

if (!process.stdin.isTTY) {
  console.error('setup-all requires an interactive terminal. Run individual setup scripts with arguments instead.');
  process.exit(1);
}

const org = resolveOrg();
if (org) {
  console.log(`Detected org: ${org}. Credentials will be scoped to this org.\n`);
  console.log('Use --global flag on individual setup scripts to store globally instead.\n');
} else {
  console.log('No git remote detected. Credentials will be stored globally.\n');
}

const setups = [
  { name: 'Sentry', script: 'skills/sentry-investigate/setup.js' },
  { name: 'Contentful', script: 'skills/contentful/setup.js' },
  { name: 'GitHub Upload', script: 'skills/pr-upload/setup.js' },
  { name: 'Jira (acli)', script: 'skills/task-jira/setup.js' },
];

const failed = [];
let succeeded = 0;

for (const entry of setups) {
  console.log(`\n--- Setting up ${entry.name} ---\n`);
  const scriptPath = path.resolve(__dirname, '..', entry.script);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    succeeded++;
  } catch {
    failed.push(entry.name);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Succeeded: ${succeeded}/${setups.length}`);
if (failed.length > 0) {
  console.log(`Failed: ${failed.join(', ')}`);
}
