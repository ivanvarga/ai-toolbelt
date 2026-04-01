#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MCP_PROTOCOL_VERSION = '2025-03-26';
const CLIENT_INFO = { name: 'tb-client', version: '0.1.0' };
const DEFAULT_TIMEOUT = 5000;
const TOOL_TIMEOUT = 10000;
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
};

function resolveForgetfulUrl() {
  try {
    const configPath = path.join(process.env.HOME, '.claude.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.mcpServers?.forgetful?.url || null;
  } catch {
    return null;
  }
}

function parseSSE(text) {
  const dataLine = text.split('\n').find(l => l.startsWith('data: '));
  if (!dataLine) return null;
  return JSON.parse(dataLine.slice(6));
}

async function createSession(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: CLIENT_INFO,
      },
      id: 1,
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  const sessionId = res.headers.get('mcp-session-id');
  const body = await res.text();
  const parsed = parseSSE(body);

  if (!sessionId) {
    throw new Error('No Mcp-Session-Id in initialize response');
  }

  await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Mcp-Session-Id': sessionId },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  return sessionId;
}

async function callTool(url, sessionId, toolName, args) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Mcp-Session-Id': sessionId },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: 2,
    }),
    signal: AbortSignal.timeout(TOOL_TIMEOUT),
  });

  const text = await res.text();
  return parseSSE(text);
}

async function healthCheck(url) {
  try {
    const sessionId = await createSession(url);
    return { ok: true, sessionId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

if (require.main === module) {
  const subcommand = process.argv[2];

  if (!subcommand || (subcommand !== 'health' && subcommand !== 'resolve-url')) {
    process.stderr.write('Usage: forgetful-client.js <health|resolve-url>\n');
    process.exit(1);
  }

  if (subcommand === 'resolve-url') {
    const url = resolveForgetfulUrl();
    if (!url) {
      process.stderr.write('not configured\n');
      process.exit(1);
    }
    process.stdout.write(url + '\n');
  }

  if (subcommand === 'health') {
    const url = resolveForgetfulUrl();
    if (!url) {
      process.stderr.write('Forgetful URL not configured in ~/.claude.json\n');
      process.exit(1);
    }
    healthCheck(url).then(result => {
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(result.ok ? 0 : 1);
    });
  }
}

module.exports = { resolveForgetfulUrl, createSession, callTool, healthCheck };
