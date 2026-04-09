#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveForgetfulUrl, createSession, callTool } = require('../scripts/forgetful-client');

const TRIVIAL_PATTERNS = new Set([
  'yes', 'no', 'ok', 'okay', 'y', 'n', 'continue', 'do it', 'go ahead',
  'sounds good', 'sure', 'yep', 'nope', 'thanks', 'thank you', 'got it',
  'done', 'next', 'lgtm', 'approved', 'looks good', 'go for it', 'please', 'right'
]);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

function extractRepoName() {
  return execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' })
    .trim()
    .replace(/.*[:/]([^/]+\/[^/]+?)(?:\.git)?$/, '$1');
}

function parseMemories(result) {
  return result?.result?.structuredContent?.primary_memories
    || JSON.parse(result?.result?.content?.[0]?.text || '{}').primary_memories
    || [];
}

function isTrivialPrompt(prompt) {
  return prompt.length < 20 && TRIVIAL_PATTERNS.has(prompt.toLowerCase().trim());
}

function failureFlagPath() {
  return path.join(os.tmpdir(), 'tb-forgetful-failed-' + process.ppid);
}

function cacheFilePath(repoName) {
  return path.join(os.tmpdir(), 'tb-project-' + repoName.replace(/\//g, '-') + '.json');
}

function getCachedProjectId(repoName) {
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFilePath(repoName), 'utf8'));
    if (cached.repoName === repoName && Date.now() - cached.ts < 3600000) return cached.projectId;
  } catch {}
  return null;
}

function setCachedProjectId(repoName, projectId) {
  fs.writeFileSync(cacheFilePath(repoName), JSON.stringify({ repoName, projectId, ts: Date.now() }));
}

async function resolveProjectId(url, sessionId, repoName) {
  const cached = getCachedProjectId(repoName);
  if (cached) return cached;

  const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
    tool_name: 'list_projects',
    arguments: { repo_name: repoName }
  });

  const projects = result?.result?.structuredContent?.projects
    || JSON.parse(result?.result?.content?.[0]?.text || '{}').projects
    || [];

  if (projects.length > 0) {
    setCachedProjectId(repoName, projects[0].id);
    return projects[0].id;
  }

  return null;
}

function outputFailureNotice() {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: '[Forgetful auto-context] Forgetful is unreachable -- auto-context disabled for this session. Use /tb:load-context for manual memory retrieval.'
    }
  }));
}

async function main() {
  const input = JSON.parse(await readStdin());
  const prompt = (input.prompt || '').trim();

  if (!prompt) process.exit(0);
  if (/^\/?gsd:|^\/?tb:load-context/i.test(prompt)) process.exit(0);
  if (isTrivialPrompt(prompt)) process.exit(0);

  const flagFile = failureFlagPath();
  if (fs.existsSync(flagFile)) process.exit(0);

  try {
    const url = resolveForgetfulUrl();
    if (!url) process.exit(0);

    let repoName;
    try {
      repoName = extractRepoName();
    } catch {
      process.exit(0);
    }

    const sessionId = await createSession(url);
    const projectId = await resolveProjectId(url, sessionId, repoName);
    if (!projectId) process.exit(0);

    const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
      tool_name: 'query_memory',
      arguments: {
        query: prompt,
        query_context: 'auto-inject: relevant project context',
        k: 5,
        project_ids: [projectId],
        include_links: false
      }
    });

    const memories = parseMemories(result).filter(m => m.importance >= 7);
    if (memories.length === 0) process.exit(0);

    const context = [
      '<forgetful_context>',
      'Relevant memories from Forgetful (' + memories.length + ' found):',
      '',
      ...memories.map(m => {
        const snippet = (m.content || '').substring(0, 300);
        return '- **' + m.title + '** (importance: ' + m.importance + '): ' + snippet + '...';
      }),
      '</forgetful_context>'
    ].join('\n');

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: context
      }
    }));
  } catch {
    if (!fs.existsSync(flagFile)) {
      fs.writeFileSync(flagFile, '');
      outputFailureNotice();
    }
    process.exit(0);
  }
}

main().catch(() => process.exit(0));
