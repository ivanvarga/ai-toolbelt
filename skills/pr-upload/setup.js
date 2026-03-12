#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const SERVICE = 'tb.github-session';
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const KEYCHAIN = path.join(PLUGIN_ROOT, 'scripts', 'keychain.js');

function store(value) {
  execSync(`node "${KEYCHAIN}" set ${SERVICE} "${value}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(`GitHub session cookie saved to Keychain (${SERVICE}).`);
}

const cookieArg = process.argv[2];
if (cookieArg) {
  store(cookieArg);
  process.exit(0);
}

let existing = '';
try {
  existing = execSync(`node "${KEYCHAIN}" get ${SERVICE}`, { encoding: 'utf8' }).trim();
} catch {}

if (existing) {
  console.log(`GitHub session cookie already configured (${SERVICE}).`);
  process.exit(0);
}

if (!process.stdin.isTTY) {
  console.error(`No session cookie found. Provide as argument: node setup.js <cookie_value>`);
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the user_session cookie value: ', (value) => {
  rl.close();
  const trimmed = value.trim();
  if (!trimmed) {
    console.error('No cookie provided.');
    process.exit(1);
  }
  store(trimmed);
});
