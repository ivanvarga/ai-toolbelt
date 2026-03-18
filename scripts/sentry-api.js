#!/usr/bin/env node
const https = require('https');
const { getCredential } = require('./resolve-credential');

function getToken() {
  const token = getCredential('tb.sentry-token');
  if (!token) {
    process.stderr.write('Sentry token not found. Run setup for sentry-investigate skill.\n');
    process.exit(1);
  }
  return token;
}

function request(apiPath) {
  const token = getToken();
  return new Promise((resolve) => {
    const req = https.get(`https://sentry.io${apiPath}`, {
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          process.stderr.write(`HTTP ${res.statusCode}: ${data}\n`);
          process.exit(1);
        }
        resolve(data);
      });
    });
    req.on('error', (err) => {
      process.stderr.write(`Request failed: ${err.message}\n`);
      process.exit(1);
    });
  });
}

const [,, action, ...args] = process.argv;

if (!action) {
  process.stderr.write('Usage: sentry-api.js <issue|event|events> <org> <project> <issue_id> [event_id]\n');
  process.exit(1);
}

async function main() {
  switch (action) {
    case 'issue': {
      const [org, project, issueId] = args;
      if (!org || !project || !issueId) {
        process.stderr.write('Usage: sentry-api.js issue <org> <project> <issue_id>\n');
        process.exit(1);
      }
      const data = await request(`/api/0/projects/${org}/${project}/issues/${issueId}/`);
      process.stdout.write(data);
      break;
    }
    case 'event': {
      const [org, project, issueId, eventId] = args;
      if (!org || !project || !issueId || !eventId) {
        process.stderr.write('Usage: sentry-api.js event <org> <project> <issue_id> <event_id>\n');
        process.exit(1);
      }
      const data = await request(`/api/0/projects/${org}/${project}/issues/${issueId}/events/${eventId}/`);
      process.stdout.write(data);
      break;
    }
    case 'events': {
      const [org, project, issueId] = args;
      if (!org || !project || !issueId) {
        process.stderr.write('Usage: sentry-api.js events <org> <project> <issue_id>\n');
        process.exit(1);
      }
      const data = await request(`/api/0/projects/${org}/${project}/issues/${issueId}/events/`);
      process.stdout.write(data);
      break;
    }
    default:
      process.stderr.write(`Unknown action: ${action}\n`);
      process.exit(1);
  }
}

main();
