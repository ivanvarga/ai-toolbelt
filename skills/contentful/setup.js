#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const SERVICE = 'tb.contentful-token';
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const KEYCHAIN = path.join(PLUGIN_ROOT, 'scripts', 'keychain.js');

function store(value) {
  execSync(`node "${KEYCHAIN}" set ${SERVICE} "${value}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(`Contentful token saved to Keychain (${SERVICE}).`);
}

const tokenArg = process.argv[2];
if (tokenArg) {
  store(tokenArg);
  process.exit(0);
}

let existing = '';
try {
  existing = execSync(`node "${KEYCHAIN}" get ${SERVICE}`, { encoding: 'utf8' }).trim();
} catch {}

if (existing) {
  console.log(`Contentful token already configured (${SERVICE}).`);
  process.exit(0);
}

if (!process.stdin.isTTY) {
  console.error(`No token found. Provide as argument: node setup.js <TOKEN>`);
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter Contentful management token: ', (token) => {
  rl.close();
  const trimmed = token.trim();
  if (!trimmed) {
    console.error('No token provided.');
    process.exit(1);
  }
  store(trimmed);
});
