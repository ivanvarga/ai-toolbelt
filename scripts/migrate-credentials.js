#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const DEFAULT_SCAN_DIRS = [
  path.join(os.homedir(), 'Projects'),
  path.join(os.homedir(), 'Work')
];
const SERVICES = ['tb.sentry-token', 'tb.github-session', 'tb.contentful-token', 'tb.jira-token', 'tb.linear-token'];
const KEYCHAIN = path.join(__dirname, 'keychain.js');

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function keychainGet(service) {
  try {
    return execSync(`node "${KEYCHAIN}" get "${service}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

function keychainSet(service, value) {
  execSync(`node "${KEYCHAIN}" set "${service}" "${value}"`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function discoverOrgs(dirs) {
  const orgMap = new Map();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    let gitDirs;
    try {
      gitDirs = execSync(`find "${dir}" -name .git -maxdepth 3 -type d`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim().split('\n').filter(Boolean);
    } catch {
      continue;
    }

    for (const gitDir of gitDirs) {
      const repoDir = path.dirname(gitDir);
      let url;
      try {
        url = execSync(`git -C "${repoDir}" remote get-url origin 2>/dev/null`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
      } catch {
        continue;
      }

      const sshColon = url.match(/:([^/]+)\/[^/]+?$/);
      if (sshColon) {
        const org = sshColon[1];
        if (!orgMap.has(org)) orgMap.set(org, []);
        orgMap.get(org).push(repoDir);
        continue;
      }

      const slashBased = url.match(/\/\/[^/]+\/([^/]+)\/[^/]+?$/);
      if (slashBased) {
        const org = slashBased[1];
        if (!orgMap.has(org)) orgMap.set(org, []);
        orgMap.get(org).push(repoDir);
      }
    }
  }

  return orgMap;
}

async function main() {
  if (!process.stdin.isTTY) {
    console.error('Error: migrate-credentials requires an interactive terminal.');
    process.exit(1);
  }

  const scanDirs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_SCAN_DIRS;

  console.log('Credential Migration: Global -> Org-Scoped\n');
  console.log(`Scanning directories: ${scanDirs.join(', ')}...\n`);

  const orgMap = discoverOrgs(scanDirs);

  if (orgMap.size === 0) {
    console.log('No git repos with remotes found. Nothing to migrate.');
    process.exit(0);
  }

  console.log('Discovered orgs:');
  for (const [org, repos] of orgMap) {
    console.log(`  ${org}: ${repos.length} repo(s)`);
  }
  console.log('');

  const globals = {};
  for (const service of SERVICES) {
    globals[service] = keychainGet(service);
  }
  const availableGlobals = SERVICES.filter(s => globals[s]);

  if (availableGlobals.length === 0) {
    console.log('No global credentials found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`Global credentials available: ${availableGlobals.map(s => s.replace('tb.', '')).join(', ')}\n`);

  for (const [org] of orgMap) {
    const answer = await prompt(`Copy global credentials to ${org}? (y/N) `);
    if (answer === 'y' || answer === 'Y') {
      for (const service of availableGlobals) {
        const orgKey = `${service}.${org}`;
        if (keychainGet(orgKey)) {
          console.log(`  ${orgKey}: already exists, skipping`);
        } else {
          keychainSet(orgKey, globals[service]);
          console.log(`  ${orgKey}: copied`);
        }
      }
    } else {
      console.log(`  Skipping ${org}`);
    }
  }

  console.log('\nMigration complete. Global credentials preserved as fallback.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
