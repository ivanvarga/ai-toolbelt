#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const TOKEN_SETUP = path.join(__dirname, 'setup-token.js');
const LINEAR_API = path.join(__dirname, '../../scripts/linear-api.js');

try {
  execSync(`node "${path.join(__dirname, '../../scripts/resolve-credential.js')}" tb.linear-token`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
} catch {
  console.error(`Linear API key missing. Run: node ${TOKEN_SETUP}`);
  process.exit(1);
}

try {
  execSync(`node "${LINEAR_API}" verify`, { stdio: ['pipe', 'pipe', 'pipe'] });
} catch (err) {
  console.error('Linear API key is set but verification failed. Re-run: node ' + TOKEN_SETUP);
  process.exit(1);
}

console.log('Linear API key configured and verified.');
