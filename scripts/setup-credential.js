#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const resolveOrg = require('./resolve-org');
const KEYCHAIN = path.join(__dirname, 'keychain.js');

function keychainGet(service) {
  try {
    return execSync(`node "${KEYCHAIN}" get ${service}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function keychainSet(service, value) {
  execSync(`node "${KEYCHAIN}" set ${service} "${value}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runKeychainMode(config) {
  const { name, verify } = config;
  const promptText = config.prompt;

  const org = resolveOrg();
  const globalFlag = process.argv.includes('--global');
  const effectiveService = (globalFlag || !org) ? config.service : `${config.service}.${org}`;

  if (org && !globalFlag) {
    console.log(`Detected org: ${org}. Storing ${config.name.toLowerCase()} for ${org}.`);
  }

  const cliArg = process.argv.filter(a => a !== '--global')[2];
  if (cliArg) {
    if (verify) {
      const result = await verify(cliArg);
      if (result === false) {
        console.error(`Verification failed for ${name}. Token rejected.`);
        process.exit(1);
      }
      if (result === null) {
        console.error(`Warning: Could not verify ${name} (connection error). Storing anyway.`);
      }
    }
    keychainSet(effectiveService, cliArg);
    console.log(`${name} saved to Keychain (${effectiveService}).`);
    process.exit(0);
  }

  const existing = keychainGet(effectiveService);
  if (existing) {
    console.log(`${name} already configured (${effectiveService}).`);
    process.exit(0);
  }

  if (!process.stdin.isTTY) {
    console.error(`No ${name} found. Provide as argument: node setup.js <value>`);
    process.exit(1);
  }

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const value = (await prompt(promptText)).trim();
    if (!value) {
      console.error('No value provided.');
      if (attempt < MAX_ATTEMPTS) continue;
      process.exit(1);
    }

    if (!verify) {
      keychainSet(effectiveService, value);
      console.log(`${name} saved to Keychain (${effectiveService}).`);
      process.exit(0);
    }

    const result = await verify(value);
    if (result === true) {
      keychainSet(effectiveService, value);
      console.log(`${name} saved to Keychain (${effectiveService}).`);
      process.exit(0);
    }

    if (result === null) {
      const answer = (await prompt('Connection error during verification. Store anyway? (y/N) ')).trim().toLowerCase();
      if (answer === 'y') {
        keychainSet(effectiveService, value);
        console.log(`${name} saved to Keychain (${effectiveService}) (unverified).`);
        process.exit(0);
      }
      if (attempt < MAX_ATTEMPTS) continue;
      process.exit(1);
    }

    console.error('Verification failed. Token is invalid.');
    if (attempt < MAX_ATTEMPTS) continue;
  }

  const answer = (await prompt('All verification attempts failed. Store anyway? (y/N) ')).trim().toLowerCase();
  if (answer === 'y') {
    const value = (await prompt(promptText)).trim();
    keychainSet(effectiveService, value);
    console.log(`${name} saved to Keychain (${effectiveService}) (unverified).`);
    process.exit(0);
  }
  process.exit(1);
}

function runCliCheckMode(config) {
  const { name, checks } = config;
  for (const check of checks) {
    try {
      execSync(check.cmd, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      console.error(check.failMsg);
      process.exit(1);
    }
  }
  console.log(`${name} is installed and configured.`);
}

module.exports = async function setupCredential(config) {
  if (config.mode === 'keychain') {
    await runKeychainMode(config);
  } else if (config.mode === 'cli-check') {
    runCliCheckMode(config);
  } else {
    console.error(`Unknown mode: ${config.mode}`);
    process.exit(1);
  }
};
