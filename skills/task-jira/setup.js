#!/usr/bin/env node
const { execSync } = require('child_process');

function checkInstalled() {
  try {
    execSync('which acli', { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function checkAuthenticated() {
  try {
    execSync('acli jira workitem view --help', { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

if (!checkInstalled()) {
  console.error('acli is not installed.');
  console.error('Install via Homebrew: brew install acli');
  console.error('Then authenticate: acli login');
  process.exit(1);
}

if (!checkAuthenticated()) {
  console.error('acli is installed but may not be authenticated.');
  console.error('Run: acli login');
  process.exit(1);
}

console.log('acli is installed and authenticated.');
