#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'keychain',
  service: 'tb.jira-token',
  name: 'Jira API token',
  prompt: 'Enter Jira API token (create at https://id.atlassian.com/manage-profile/security/api-tokens): ',
  verify: (token) => {
    const https = require('https');
    const { execSync } = require('child_process');
    let email;
    try {
      const output = execSync('acli jira auth status', { encoding: 'utf8' });
      const match = output.match(/Email:\s*(\S+)/);
      if (match) email = match[1];
    } catch {}
    if (!email) return Promise.resolve(null);
    return new Promise((resolve) => {
      const req = https.get('https://stadion.atlassian.net/rest/api/3/myself', {
        headers: { Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}` }
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
