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

async function main() {
  const domainArg = process.argv[2];
  if (!domainArg) process.exit(0);

  const url = resolveForgetfulUrl();
  if (!url) process.exit(0);

  const sessionId = await createSession(url);
  const projectId = await resolveProjectId(url, sessionId);
  if (!projectId) process.exit(0);

  const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
    tool_name: 'query_memory',
    arguments: {
      query: `${domainArg} patterns and architecture`,
      query_context: 'GSD new-project: prior project patterns',
      k: 5,
      project_ids: [projectId],
      include_links: true,
      max_links_per_primary: 2
    }
  });

  const memories = parseMemories(result);
  if (memories.length === 0) process.exit(0);

  process.stdout.write('<forgetful_project_context>\n');
  process.stdout.write(`Relevant memories from Forgetful (${memories.length} found):\n\n`);
  for (const mem of memories) {
    const snippet = (mem.content || '').substring(0, 300);
    process.stdout.write(`- **${mem.title}** (importance: ${mem.importance}): ${snippet}...\n`);
  }
  process.stdout.write('</forgetful_project_context>\n');
}

main().catch(() => process.exit(0));
