#!/usr/bin/env node
const RESET = '\x1b[0m';

const ROLES = {
  planner: { emoji: '🧭', ansi: '35' },
  researcher: { emoji: '🔎', ansi: '36' },
  executor: { emoji: '🔨', ansi: '38;5;208' },
  quick: { emoji: '⚡', ansi: '32' },
  'verifier-review': { emoji: '🧪', ansi: '33' },
  'verifier-flow': { emoji: '🎬', ansi: '34' },
  'pr-author': { emoji: '📬', ansi: '95' },
};

const FALLBACK = { emoji: '🤖', ansi: '90' };

function roleName(agentType) {
  return String(agentType || '').replace(/^tb:/, '');
}

function formatTokens(count) {
  if (typeof count !== 'number') return '';
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k tokens` : `${count} tokens`;
}

function badgeFor(agentType) {
  const type = String(agentType || '');
  if (!type.startsWith('tb:')) return '';
  const name = roleName(type);
  const role = ROLES[name] || FALLBACK;
  return `${role.emoji} \x1b[${role.ansi}m${name}${RESET}`;
}

function rowContent(task) {
  const body = [task.name, task.description || task.label, formatTokens(task.tokenCount)]
    .filter(Boolean)
    .join(' · ');
  const badge = badgeFor(task.agentType);
  return badge ? `${badge} ${body}` : body;
}

function render(input) {
  const tasks = Array.isArray(input.tasks) ? input.tasks : [];
  return tasks
    .filter((task) => task && task.id)
    .map((task) => JSON.stringify({ id: task.id, content: rowContent(task) }));
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }
  const lines = render(input);
  if (lines.length) process.stdout.write(lines.join('\n') + '\n');
});
