#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'cli-check',
  name: 'acli (Atlassian CLI)',
  checks: [
    { cmd: 'which acli', failMsg: 'acli is not installed. Install via Homebrew: brew install acli' },
    { cmd: 'acli jira workitem view --help', failMsg: 'acli is installed but may not be authenticated. Run: acli login' }
  ]
});
