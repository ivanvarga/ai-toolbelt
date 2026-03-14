# Phase 13: Create attachment-documenter Agent - Research

**Researched:** 2026-03-14
**Domain:** Claude Code plugin subagents, agent definitions, skill-to-agent delegation
**Confidence:** HIGH

## Summary

Phase 13 creates the attachment-documenter agent definition in `agents/attachment-documenter/` and its orchestrating skill in `skills/attachment-documenter/`, then updates the 4 consumer skills to use the named `subagent_type: "attachment-documenter"` pattern instead of `general-purpose`. It also switches Jira auth from `$JIRA_API_TOKEN` env var to keychain.js and adds GitHub token support for private repos. Finally, the original files at `~/.claude/agents/attachment-documenter.md` and `~/.claude/skills/attachment-documenter/` are removed.

The existing source material is comprehensive -- a fully working agent definition (`~/.claude/agents/attachment-documenter.md`) and orchestrating skill (`~/.claude/skills/attachment-documenter/SKILL.md`) already exist. The work is primarily a port with auth upgrades, not greenfield development. The 4 consumer skills already have attachment-documenter invocation sections that need minimal changes (switching from `subagent_type: "general-purpose"` to `"attachment-documenter"`).

**Primary recommendation:** Port existing files into plugin structure, upgrade auth to keychain.js, update consumer skills to use named subagent_type, and verify the full invocation chain works.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Include BOTH the agent definition (agents/attachment-documenter/) AND the orchestrating SKILL.md (skills/attachment-documenter/)
- The SKILL.md acts as a catch-all trigger for any context with attachments, not just the 4 known consumer skills
- Remove originals from ~/.claude/agents/attachment-documenter.md and ~/.claude/skills/attachment-documenter/ after plugin versions are created
- Switch from $JIRA_API_TOKEN env var to keychain.js for Jira token retrieval
- Also add GitHub token from keychain for GitHub URLs (handles private repo screenshots)
- Sentry screenshots remain unauthenticated
- Use named `subagent_type: "attachment-documenter"` in consumer skills, not general-purpose + haiku
- Update all 4 consumer skills (task-jira, sentry-investigate, task-github, pr-read) in this phase to use the named agent type
- Model stays haiku -- sufficient for download/analyze/cache subtask

### Claude's Discretion
- SKILL.md detail level -- trim or port as-is from existing
- Agent tool list -- whether to add WebFetch alongside Read/Bash/Write
- Jira email source -- keychain entry vs acli
- Auth failure behavior -- try unauthenticated first vs fail fast
- Caller prompt detail -- minimal (URLs + naming + context) vs detailed per-skill prompts

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-02 | All 8 complex items converted to SKILL.md + frontmatter format with supporting files | Agent definition + orchestrating skill complete the attachment-documenter gap identified as INT-03 in milestone audit; consumer skills already converted in Phase 4 |
</phase_requirements>

## Standard Stack

### Core
| Component | Type | Purpose | Why Standard |
|-----------|------|---------|--------------|
| Agent definition `.md` | Markdown + YAML frontmatter | Defines subagent name, description, tools, model | Official Claude Code subagent format per docs |
| Orchestrating SKILL.md | Markdown + YAML frontmatter | Catch-all trigger for attachment contexts | Plugin skill format established in Phases 3-4 |
| keychain.js | Node.js script | Credential retrieval for Jira/GitHub tokens | Already used by 5 other skills in the plugin |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `acli jira auth status` | Extract Jira email for Basic Auth | Only when downloading Jira attachments |
| `curl -L` | Download attachments | All URL types (Jira, GitHub, Sentry, other) |
| Read tool | Analyze downloaded images | After download, before caching |

## Architecture Patterns

### Plugin Agent Structure

Plugin agents live in `agents/` at the plugin root, discovered automatically by Claude Code:

```
agents/
  attachment-documenter/
    attachment-documenter.md    # Agent definition file
```

The agent file uses YAML frontmatter + markdown body (system prompt):

```markdown
---
name: attachment-documenter
description: Downloads and analyzes image attachments from URLs
tools: Read, Bash, Write
model: haiku
---

[System prompt instructions here]
```

**Critical:** The agent body becomes the subagent's system prompt. It does NOT receive the main Claude Code system prompt, CLAUDE.md, or parent conversation skills. It only gets this body text plus basic environment details (working directory).

### Plugin Skill Structure

```
skills/
  attachment-documenter/
    SKILL.md    # Orchestrating skill
```

The SKILL.md acts as a catch-all trigger. When the main agent sees attachments in any context, this skill instructs it to delegate to the attachment-documenter subagent via the Agent tool (formerly Task tool).

### Invocation Pattern: Named subagent_type

Consumer skills reference the agent by name:

```
Agent tool parameters:
- description: "Document attachment"
- subagent_type: "attachment-documenter"
- prompt: [URLs, naming, context]
```

This is superior to `subagent_type: "general-purpose"` + `model: "haiku"` because:
1. Claude routes directly to the named agent definition
2. The agent gets its specialized system prompt
3. Tool restrictions (Read, Bash, Write only) are enforced
4. Model (haiku) is set by the agent definition, not the caller

### Auth Pattern: Keychain-based Credentials in Agent Prompts

**Problem:** The agent body (system prompt) cannot use `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_SKILL_DIR}` -- these path variables do NOT resolve in markdown content. The agent also does not inherit the parent's environment or skills.

**Solution:** The agent's bash commands use a runtime discovery pattern:

For Jira tokens:
```bash
# Find keychain.js relative to cwd or use a known absolute path
# The agent can use Bash to locate and invoke keychain.js
node "$(find ~/.claude/plugins -name keychain.js -path '*/ai-toolbelt/*' 2>/dev/null | head -1)" get tb.jira-token
```

**Better approach:** The CALLER (consumer skill or orchestrating skill) retrieves credentials and passes them in the agent prompt. The agent body documents how to use them:

```
# In the caller's prompt to the agent:
"Jira auth: use --user 'email:TOKEN' with curl. Email: <email>. Token: <token>"
```

**Recommended approach for this project:** Have the agent's bash steps retrieve the Jira token directly from keychain at runtime. The agent has Bash tool access, so it can run:
```bash
JIRA_TOKEN=$(security find-generic-password -s "tb.jira-token" -w 2>/dev/null)
```

This avoids path resolution issues entirely -- `security` is a macOS system command available everywhere.

Similarly for GitHub:
```bash
GH_TOKEN=$(security find-generic-password -s "tb.github-session" -w 2>/dev/null)
```

### Consumer Skill Update Pattern

Each consumer skill has an "attachment" section. The changes are minimal:

**Before (current state):**
```
1. Invoke the `attachment-documenter` agent via Task tool with:
   - Image URLs
   - Naming convention: ...
   - Task context: ...
```

**After (with named subagent_type):**
```
1. Invoke the `attachment-documenter` agent via Agent tool with:
   - subagent_type: "attachment-documenter"
   - Image URLs
   - Naming convention: ...
   - Task context: ...
```

The change is adding `subagent_type: "attachment-documenter"` and updating "Task tool" to "Agent tool" (the rename happened in Claude Code v2.1.63).

### Cleanup Pattern

After plugin versions are verified working:
```bash
rm ~/.claude/agents/attachment-documenter.md
rm -rf ~/.claude/skills/attachment-documenter/
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Credential retrieval | Custom env var parsing | `security find-generic-password -s "tb.jira-token" -w` in agent, `keychain.js` in skills | macOS Keychain is the established pattern; security command needs no path resolution |
| Image analysis | Custom OCR/parsing | Claude's multimodal Read tool on image files | Haiku model handles image analysis natively |
| Agent orchestration | Manual prompt chaining | Agent tool with `subagent_type: "attachment-documenter"` | Built-in Claude Code delegation mechanism |
| File caching | Custom cache system | Simple `.claude/attachments/{name}.md` files | Already established pattern, check-before-download |

## Common Pitfalls

### Pitfall 1: Path Variables in Agent Body
**What goes wrong:** Using `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_SKILL_DIR}` in the agent markdown body, expecting them to resolve.
**Why it happens:** They work in hooks and MCP configs, but NOT in skill/agent markdown content.
**How to avoid:** Use macOS `security` command directly for keychain access. Use project-relative paths (`.claude/attachments/`) for output.
**Warning signs:** Agent fails to find keychain.js or scripts.

### Pitfall 2: Agent Not Inheriting Parent Skills
**What goes wrong:** Expecting the agent to know about naming conventions or auth patterns from the parent conversation.
**Why it happens:** Subagents receive ONLY their system prompt + basic environment info. They don't inherit skills, CLAUDE.md, or parent context.
**How to avoid:** Include ALL necessary instructions in the agent's system prompt (markdown body). Be explicit about naming conventions, auth steps, and output format.
**Warning signs:** Agent doesn't follow naming conventions, skips auth for Jira URLs.

### Pitfall 3: Using general-purpose Instead of Named Agent
**What goes wrong:** Consumer skills specify `subagent_type: "general-purpose"` which doesn't route to the attachment-documenter agent definition.
**Why it happens:** The existing skill at `~/.claude/skills/attachment-documenter/SKILL.md` uses `general-purpose`.
**How to avoid:** All consumer skills must use `subagent_type: "attachment-documenter"` to route to the named agent.
**Warning signs:** Agent doesn't follow the attachment-documenter process, uses wrong model.

### Pitfall 4: Jira Auth Email Source
**What goes wrong:** Hardcoding an email or using a stale value for Jira Basic Auth.
**Why it happens:** Jira REST API requires `email:token` for Basic Auth.
**How to avoid:** Use `acli jira auth status` at runtime to get the current email, or store it in keychain alongside the token.
**Warning signs:** 401 errors on Jira attachment downloads.

### Pitfall 5: GitHub Token Service Name Mismatch
**What goes wrong:** Using `tb.github-upload-token` instead of the actual service name `tb.github-session`.
**Why it happens:** CONTEXT.md references `tb.github-upload-token` but the codebase consistently uses `tb.github-session`.
**How to avoid:** Use `tb.github-session` -- this is the established keychain service name used by pr-upload, github-api.js, and credential checks.
**Warning signs:** Token retrieval fails silently, GitHub downloads fail for private repos.

### Pitfall 6: Task Tool vs Agent Tool Naming
**What goes wrong:** Referencing "Task tool" in skill instructions when the tool was renamed to "Agent tool" in Claude Code v2.1.63.
**Why it happens:** Old documentation and existing skills use "Task tool" terminology.
**How to avoid:** Use "Agent tool" in new content. Both names work as aliases, but new content should use current naming.
**Warning signs:** Confusion only; both names work at runtime.

## Code Examples

### Agent Definition File

Source: Official Claude Code subagent docs + existing `~/.claude/agents/attachment-documenter.md`

```markdown
---
name: attachment-documenter
description: Downloads and analyzes image attachments. Pass URLs and it figures out how to download based on URL pattern.
tools: Read, Bash, Write
model: haiku
---

Download and analyze images from URLs. Caches results.

## Input

URLs of images to download and analyze. May include:
- Ticket/issue ID for naming
- Task context for context-aware analysis

## Process - FOLLOW EXACTLY IN ORDER

### Step 1: Create output directory
mkdir -p .claude/attachments

### Step 2: Check cache
[... check if .md exists ...]

### Step 3: Detect URL type and get auth
If URL contains `atlassian.net` (Jira):
  JIRA_TOKEN=$(security find-generic-password -s "tb.jira-token" -w 2>/dev/null)
  EMAIL=$(acli jira auth status | grep "Email:" | awk '{print $2}')

If URL contains `github.com` or `githubusercontent.com`:
  GH_TOKEN=$(security find-generic-password -s "tb.github-session" -w 2>/dev/null)

### Step 4: Download with auth
For Jira: curl -L --user "$EMAIL:$JIRA_TOKEN" "$URL" -o ".claude/attachments/$NAME.png"
For GitHub (private): curl -L -H "Authorization: token $GH_TOKEN" "$URL" -o ".claude/attachments/$NAME.png"
For other: curl -L "$URL" -o ".claude/attachments/$NAME.png"

[... verify, analyze, cache, return ...]
```

### Consumer Skill Invocation Pattern

Source: Existing consumer skills + CONTEXT.md decisions

```markdown
### Handle Images

If attachments include images:

1. Invoke the `attachment-documenter` agent via Agent tool with:
   - subagent_type: "attachment-documenter"
   - The image URLs found
   - Naming convention: `jira_{TICKET}_{ATTACHMENT_ID}`
   - Task context: ticket title + 1-2 sentence summary
```

### Keychain Direct Access (in Agent)

Source: macOS security command + established keychain.js pattern

```bash
# Jira token (for atlassian.net URLs)
JIRA_TOKEN=$(security find-generic-password -s "tb.jira-token" -w 2>/dev/null)

# GitHub token (for github.com / private repo URLs)
GH_TOKEN=$(security find-generic-password -s "tb.github-session" -w 2>/dev/null)

# These bypass any path resolution issues since security is a system command
```

## Discretion Recommendations

### SKILL.md Detail Level
**Recommendation: Port as-is, trim common mistakes table only.** The existing SKILL.md at `~/.claude/skills/attachment-documenter/SKILL.md` is well-structured at 246 lines with clear flow, naming conventions, directory structure, documentation format, examples, and anti-patterns. The common mistakes table can be trimmed since the named subagent_type eliminates the "wrong model" mistake. Everything else is valuable context for the main agent.

### Agent Tool List
**Recommendation: Keep Read, Bash, Write only. Do NOT add WebFetch.** The agent downloads via curl (Bash), reads images (Read), and writes cache files (Write). WebFetch would add unnecessary capability and the agent doesn't need to fetch web pages -- it downloads binary files via curl.

### Jira Email Source
**Recommendation: Use `acli jira auth status` at runtime.** This is what the existing agent does. Adding a separate keychain entry for email is unnecessary complexity. The email rarely changes and acli already manages it. If acli is not available, the agent can fall back to a hardcoded prompt asking the caller to provide it.

### Auth Failure Behavior
**Recommendation: Try authenticated first, fall back to unauthenticated on failure.** For Jira URLs, if keychain has no `tb.jira-token`, report the error (Jira always needs auth). For GitHub URLs, try with token first; if no token in keychain, try unauthenticated (public repos don't need auth). For Sentry/other URLs, always unauthenticated.

### Caller Prompt Detail
**Recommendation: Minimal -- URLs + naming + task context.** The agent's system prompt contains all the process details. Callers only need to provide: image URLs, naming convention for this source type, and task context (title + description). The existing consumer skill sections already follow this pattern.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Task tool | Agent tool | Claude Code v2.1.63 | Tool renamed; old name still works as alias |
| `subagent_type: "general-purpose"` + `model: "haiku"` | `subagent_type: "attachment-documenter"` | Named agents feature | Routes to correct agent definition with proper system prompt |
| `$JIRA_API_TOKEN` env var | Keychain `tb.jira-token` via `security` command | This phase | Consistent with plugin credential pattern |

## Open Questions

1. **Jira token keychain entry**
   - What we know: task-jira uses acli (OAuth) not a keychain token. The keychain entry `tb.jira-token` may not exist yet.
   - What's unclear: Whether a setup.js is needed for the attachment-documenter to store the Jira API token, or if users are expected to set it up manually.
   - Recommendation: Add a note in the agent that if `tb.jira-token` is not found, the user should set it via `node scripts/keychain.js set tb.jira-token <token>`. A full setup.js can be deferred since Jira attachment downloads are a secondary feature.

2. **Agent file naming convention**
   - What we know: Plugin agents live in `agents/` directory. Official docs show flat `.md` files (e.g., `agents/security-reviewer.md`). The project has `agents/attachment-documenter/` directory (with .gitkeep).
   - What's unclear: Whether the agent file should be `agents/attachment-documenter.md` (flat) or `agents/attachment-documenter/attachment-documenter.md` (in subdirectory).
   - Recommendation: Use `agents/attachment-documenter.md` (flat file) since the official plugin structure example shows flat `.md` files in `agents/`. The existing `.gitkeep` directory can be removed. However, if other supporting files are needed, use the subdirectory.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification (skill/agent invocation) |
| Config file | none |
| Quick run command | `claude --plugin-dir ./ --debug` + invoke /tb:task-jira with a ticket that has attachments |
| Full suite command | Invoke each of the 4 consumer skills with attachment-containing sources |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-02 | Agent definition exists and is valid | smoke | `ls agents/attachment-documenter.md && head -10 agents/attachment-documenter.md` | Wave 0 |
| MIGR-02 | Orchestrating skill exists | smoke | `ls skills/attachment-documenter/SKILL.md && head -5 skills/attachment-documenter/SKILL.md` | Wave 0 |
| MIGR-02 | Consumer skills reference named agent | smoke | `grep "subagent_type.*attachment-documenter" skills/task-jira/SKILL.md skills/sentry-investigate/SKILL.md skills/task-github/SKILL.md skills/pr-read/SKILL.md` | Wave 0 |
| MIGR-02 | Original files removed | smoke | `! test -f ~/.claude/agents/attachment-documenter.md && ! test -d ~/.claude/skills/attachment-documenter/` | Wave 0 |
| MIGR-02 | No .gitkeep-only state | smoke | `test -f agents/attachment-documenter.md` | Wave 0 |
| INT-03 | Agent invocable at runtime | manual-only | Load plugin with `claude --plugin-dir ./`, run `/agents` to verify attachment-documenter appears | Justification: requires interactive Claude Code session |

### Sampling Rate
- **Per task commit:** `grep -c "attachment-documenter" skills/task-jira/SKILL.md skills/sentry-investigate/SKILL.md skills/task-github/SKILL.md skills/pr-read/SKILL.md`
- **Per wave merge:** All smoke tests above
- **Phase gate:** Full suite (smoke + manual runtime check)

### Wave 0 Gaps
- [ ] `agents/attachment-documenter.md` -- agent definition (core deliverable)
- [ ] `skills/attachment-documenter/SKILL.md` -- orchestrating skill (core deliverable)
- [ ] All verification is file-existence and content-grep based; no test framework needed

## Sources

### Primary (HIGH confidence)
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Full agent definition format, frontmatter fields, tools, model, skills preloading, invocation patterns
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin agent directory structure, path variables, component discovery
- `~/.claude/agents/attachment-documenter.md` -- Existing working agent definition (source material)
- `~/.claude/skills/attachment-documenter/SKILL.md` -- Existing working orchestrating skill (source material)

### Secondary (MEDIUM confidence)
- Consumer skills in `skills/` directory -- Verified current attachment-documenter invocation patterns
- `scripts/keychain.js` -- Verified keychain service names: `tb.github-session` (not `tb.github-upload-token`)

### Tertiary (LOW confidence)
- [Agent tool rename](https://code.claude.com/docs/en/sub-agents) -- Task tool renamed to Agent tool in v2.1.63; old name works as alias

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Official docs verified, existing working implementation to port
- Architecture: HIGH -- Plugin agent/skill patterns well-established in this project (Phases 3-4)
- Pitfalls: HIGH -- Path variable limitations confirmed in project CLAUDE.md; keychain service names verified in codebase

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- Claude Code plugin format is mature)
