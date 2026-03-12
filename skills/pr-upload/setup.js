#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'keychain',
  service: 'tb.github-session',
  name: 'GitHub session cookie',
  prompt: 'Paste the user_session cookie value: ',
  verify: null
});
