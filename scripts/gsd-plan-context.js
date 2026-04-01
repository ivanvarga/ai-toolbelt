#!/usr/bin/env node
const { execSync } = require('child_process');
const { resolveForgetfulUrl, createSession, callTool } = require('./forgetful-client');

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

async function resolveProjectId(url, sessionId) {
  const repoName = extractRepoName();
  const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
    tool_name: 'list_projects',
    arguments: { repo_name: repoName }
  });
  const projects = result?.result?.structuredContent?.projects
    || JSON.parse(result?.result?.content?.[0]?.text || '{}').projects
    || [];
  return projects.length > 0 ? projects[0].id : null;
}

function deduplicateById(memories) {
  const seen = new Set();
  return memories.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

async function main() {
  const phaseArg = process.argv[2];
  if (!phaseArg) process.exit(0);
  const techArg = process.argv[3] || phaseArg;

  const url = resolveForgetfulUrl();
  if (!url) process.exit(0);

  const sessionId = await createSession(url);
  const projectId = await resolveProjectId(url, sessionId);
  if (!projectId) process.exit(0);

  const [implResult, stackResult] = await Promise.all([
    callTool(url, sessionId, 'execute_forgetful_tool', {
      tool_name: 'query_memory',
      arguments: {
        query: `${phaseArg} implementation patterns`,
        query_context: 'GSD plan-phase: how we built similar features',
        k: 5,
        project_ids: [projectId],
        include_links: true,
        max_links_per_primary: 2
      }
    }),
    callTool(url, sessionId, 'execute_forgetful_tool', {
      tool_name: 'query_memory',
      arguments: {
        query: `${techArg} technology and stack`,
        query_context: 'GSD plan-phase: technology constraints and patterns',
        k: 3,
        project_ids: [projectId],
        include_links: true,
        max_links_per_primary: 2
      }
    })
  ]);

  const implMemories = parseMemories(implResult);
  const stackMemories = parseMemories(stackResult);

  const allImpl = deduplicateById(implMemories);
  const stackOnly = stackMemories.filter(m => !allImpl.some(a => a.id === m.id));

  if (allImpl.length === 0 && stackOnly.length === 0) process.exit(0);

  process.stdout.write('<forgetful_plan_context>\n\n');

  if (allImpl.length > 0) {
    process.stdout.write('## Implementation Patterns\n\n');
    for (const mem of allImpl) {
      const snippet = (mem.content || '').substring(0, 300);
      process.stdout.write(`- **${mem.title}** (importance: ${mem.importance}): ${snippet}...\n`);
    }
    process.stdout.write('\n');
  }

  if (stackOnly.length > 0) {
    process.stdout.write('## Technology Context\n\n');
    for (const mem of stackOnly) {
      const snippet = (mem.content || '').substring(0, 300);
      process.stdout.write(`- **${mem.title}** (importance: ${mem.importance}): ${snippet}...\n`);
    }
    process.stdout.write('\n');
  }

  process.stdout.write('</forgetful_plan_context>\n');
}

main().catch(() => process.exit(0));
