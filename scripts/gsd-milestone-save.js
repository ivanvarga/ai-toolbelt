#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const { resolveForgetfulUrl, createSession, callTool } = require('./forgetful-client');

const SECTION_HEADINGS = [
  { pattern: /^#{1,3}\s*Key Outcomes/i, tag: 'milestone-outcome' },
  { pattern: /^#{1,3}\s*Accomplishments/i, tag: 'milestone-outcome' },
  { pattern: /^#{1,3}\s*Lessons Learned/i, tag: 'lesson-learned' },
  { pattern: /^#{1,3}\s*Key Lessons/i, tag: 'lesson-learned' },
  { pattern: /^#{1,3}\s*Patterns Established/i, tag: 'pattern' },
  { pattern: /^#{1,3}\s*Key Decisions/i, tag: 'decision' }
];

const MAX_WORDS = 400;

function trimToWords(text, max) {
  const words = text.split(/\s+/);
  return words.length <= max ? text : words.slice(0, max).join(' ') + '...';
}

function extractSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = SECTION_HEADINGS.find(h => h.pattern.test(line));
    if (match) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, '').trim(), tag: match.tag, body: [] };
      continue;
    }
    if (current) {
      if (/^#{1,3}\s/.test(line) && !SECTION_HEADINGS.some(h => h.pattern.test(line))) {
        sections.push(current);
        current = null;
      } else {
        current.body.push(line);
      }
    }
  }
  if (current) sections.push(current);

  return sections.map(s => ({
    heading: s.heading,
    tag: s.tag,
    body: trimToWords(s.body.join('\n').trim(), MAX_WORDS)
  })).filter(s => s.body.length > 0);
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

async function findExistingMilestoneMemories(url, sessionId, projectId, version) {
  const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
    tool_name: 'query_memory',
    arguments: {
      query: `milestone ${version}`,
      k: 10,
      project_ids: [projectId]
    }
  });
  return parseMemories(result).filter(m =>
    m.title && m.title.toLowerCase().includes(`milestone ${version.toLowerCase()}`)
  );
}

async function main() {
  const version = process.argv[2];
  const filePath = process.argv[3];
  if (!version || !filePath) process.exit(0);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  const sections = extractSections(content);
  if (sections.length === 0) process.exit(0);

  const candidates = sections.map(s => ({
    action: 'create',
    title: `[Milestone ${version}] ${s.heading}`,
    content: s.body,
    importance: s.tag === 'lesson-learned' ? 8 : 7,
    tags: [s.tag, version]
  }));

  const url = resolveForgetfulUrl();
  if (url) {
    try {
      const sessionId = await createSession(url);
      const projectId = await resolveProjectId(url, sessionId);
      if (projectId) {
        const existing = await findExistingMilestoneMemories(url, sessionId, projectId, version);
        for (const mem of existing) {
          candidates.push({
            action: 'obsolete',
            memory_id: mem.id,
            title: mem.title
          });
        }
      }
    } catch {
      // Forgetful unreachable -- output create candidates only
    }
  }

  process.stdout.write(JSON.stringify(candidates, null, 2) + '\n');
}

main().catch(() => process.exit(0));
