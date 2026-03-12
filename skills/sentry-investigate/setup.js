#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'keychain',
  service: 'tb.sentry-token',
  name: 'Sentry auth token',
  prompt: 'Enter Sentry auth token: ',
  verify: (token) => {
    const https = require('https');
    return new Promise((resolve) => {
      const req = https.get('https://sentry.io/api/0/organizations/', {
        headers: { Authorization: `Bearer ${token}` }
      }, (res) => {
        res.resume();
        if (res.statusCode === 401 || res.statusCode === 403) return resolve(false);
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    });
  }
});
