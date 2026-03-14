# Phase 13: Create attachment-documenter Agent - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the attachment-documenter agent definition in agents/ and its orchestrating skill in skills/, so the 4 consumer skills (task-jira, sentry-investigate, task-github, pr-read) can invoke it via Task tool at runtime. Closes INT-03 from milestone audit. Also clean up the original files from ~/.claude/.

</domain>

<decisions>
## Implementation Decisions

### Agent + skill packaging
- Include BOTH the agent definition (agents/attachment-documenter/) AND the orchestrating SKILL.md (skills/attachment-documenter/)
- The SKILL.md acts as a catch-all trigger for any context with attachments, not just the 4 known consumer skills
- Remove originals from ~/.claude/agents/attachment-documenter.md and ~/.claude/skills/attachment-documenter/ after plugin versions are created

### Jira auth mechanism
- Switch from $JIRA_API_TOKEN env var to keychain.js for Jira token retrieval
- Also add GitHub token from keychain for GitHub URLs (handles private repo screenshots)
- Sentry screenshots remain unauthenticated

### Agent invocation pattern
- Use named `subagent_type: "attachment-documenter"` in consumer skills, not general-purpose + haiku
- Update all 4 consumer skills (task-jira, sentry-investigate, task-github, pr-read) in this phase to use the named agent type
- Model stays haiku -- sufficient for download/analyze/cache subtask

### Claude's Discretion
- SKILL.md detail level -- trim or port as-is from existing
- Agent tool list -- whether to add WebFetch alongside Read/Bash/Write
- Jira email source -- keychain entry vs acli
- Auth failure behavior -- try unauthenticated first vs fail fast
- Caller prompt detail -- minimal (URLs + naming + context) vs detailed per-skill prompts

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `~/.claude/agents/attachment-documenter.md`: Existing agent definition with frontmatter (name, description, tools: Read/Bash/Write, model: haiku) and full process documentation
- `~/.claude/skills/attachment-documenter/SKILL.md`: Orchestrating skill with naming conventions, flow diagram, example workflows, common mistakes
- `scripts/keychain.js`: Keychain credential helper used across all plugin skills

### Established Patterns
- Agent definitions use markdown with YAML frontmatter (name, description, tools, model)
- Skills use SKILL.md with frontmatter (name, description) and markdown instructions
- Credentials fetched via `node ${CLAUDE_SKILL_DIR}/../scripts/keychain.js get <service>`
- 4 consumer skills already have "Invoke attachment-documenter agent via Task tool" sections with source-specific naming conventions

### Integration Points
- `agents/attachment-documenter/` directory (currently .gitkeep only)
- `skills/attachment-documenter/SKILL.md` (new)
- Consumer skills: skills/task-jira/SKILL.md, skills/sentry-investigate/SKILL.md, skills/task-github/SKILL.md, skills/pr-read/SKILL.md
- keychain.js for Jira token (tb.jira-token) and GitHub token (tb.github-upload-token)

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 13-attachment-documenter-agent*
*Context gathered: 2026-03-14*
