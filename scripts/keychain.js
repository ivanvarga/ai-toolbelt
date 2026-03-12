#!/usr/bin/env node
const { execSync } = require('child_process');

const [,, action, service, ...rest] = process.argv;

if (!action || !service) {
  process.stderr.write('Usage: keychain.js <get|set|delete> <service> [value]\n');
  process.exit(1);
}

switch (action) {
  case 'get': {
    try {
      const value = execSync(
        `security find-generic-password -s "${service}" -w`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      process.stdout.write(value);
    } catch {
      process.exit(1);
    }
    break;
  }
  case 'set': {
    const value = rest[0];
    if (!value) {
      process.stderr.write('Usage: keychain.js set <service> <value>\n');
      process.exit(1);
    }
    try { execSync(`security delete-generic-password -s "${service}"`, { stdio: ['pipe', 'pipe', 'pipe'] }); } catch {}
    execSync(`security add-generic-password -s "${service}" -a "${service}" -w "${value}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
    break;
  }
  case 'delete': {
    try { execSync(`security delete-generic-password -s "${service}"`, { stdio: ['pipe', 'pipe', 'pipe'] }); } catch {}
    break;
  }
  default:
    process.stderr.write(`Unknown action: ${action}\n`);
    process.exit(1);
}
