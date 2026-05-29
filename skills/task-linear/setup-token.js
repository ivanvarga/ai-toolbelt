#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
const https = require('https');

function verifyToken(token) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ query: 'query { viewer { id } }' });
    const req = https.request('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) return resolve(false);
        if (res.statusCode < 200 || res.statusCode >= 300) return resolve(null);
        try {
          const parsed = JSON.parse(chunks);
          if (parsed.errors) return resolve(false);
          resolve(Boolean(parsed?.data?.viewer?.id));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

setup({
  mode: 'keychain',
  service: 'tb.linear-token',
  name: 'Linear API key',
  prompt: 'Enter Linear API key (create at https://linear.app/settings/account/security/api-keys): ',
  verify: verifyToken
});
