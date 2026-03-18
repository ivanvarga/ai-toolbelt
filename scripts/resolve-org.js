#!/usr/bin/env node
const { execSync } = require('child_process');

function resolveOrg() {
  let url;
  try {
    url = execSync('git remote get-url origin', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }

  const sshColon = url.match(/:([^/]+)\/[^/]+?$/);
  if (sshColon) return sshColon[1];

  const slashBased = url.match(/\/\/[^/]+\/([^/]+)\/[^/]+?$/);
  if (slashBased) return slashBased[1];

  return null;
}

if (require.main === module) {
  const org = resolveOrg();
  if (org) {
    process.stdout.write(org);
  } else {
    process.exit(1);
  }
}

module.exports = resolveOrg;
