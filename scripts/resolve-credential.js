#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const resolveOrg = require('./resolve-org');

const KEYCHAIN = path.join(__dirname, 'keychain.js');

function keychainGet(service) {
  try {
    return execSync(`node "${KEYCHAIN}" get ${service}`, {
      encoding: 'utf8'
    }).trim();
  } catch {
    return null;
  }
}

function getCredential(service) {
  const org = resolveOrg();
  if (org) {
    const scoped = keychainGet(`${service}.${org}`);
    if (scoped) return scoped;
  }
  return keychainGet(service);
}

if (require.main === module) {
  const service = process.argv[2];
  if (!service) {
    process.stderr.write('Usage: resolve-credential.js <service>\n');
    process.exit(1);
  }
  const value = getCredential(service);
  if (!value) {
    process.exit(1);
  }
  process.stdout.write(value);
}

module.exports = { getCredential };
