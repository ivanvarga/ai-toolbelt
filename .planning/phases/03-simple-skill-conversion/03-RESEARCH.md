# Phase 3: Simple Skill Conversion - Research

**Researched:** 2026-03-11
**Domain:** Claude Code SKILL.md authoring / skill conversion
**Confidence:** HIGH

## Summary

This phase converts 8 pure-markdown items from `~/.claude/commands/` and `~/.claude/skills/` into the plugin's `skills/` directory as SKILL.md files with proper frontmatter. The items are all "simple" -- they contain no helper scripts, no credential dependencies, and no supporting files beyond SKILL.md itself.

The conversion is well-constrained: the SKILL.md spec is straightforward (name + description frontmatter, markdown body), the plugin already has two working reference skills (doctor, update), and the SessionStart hook auto-discovers new skills via frontmatter scanning. The primary work is content rewriting -- adapting each item's instructions to the new naming conventions, removing `$ARGUMENTS` placeholders where appropriate, and ensuring cross-skill references use `/tb:*` names.

**Primary recommendation:** Convert skills in two waves per the batched strategy. Use doctor/update SKILL.md as format reference. Each SKILL.md needs name + description frontmatter minimum. Keep bodies under 500 lines. Use `/skill-creator` for verification after each wave.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All 8 names follow PROJECT.md mapping exactly: catchup, task-github, pr-read, pr-qa, pr-submit, release-create, track-summary, mobile-reset
- Directory name matches SKILL.md frontmatter name
- Cross-skill references use new /tb:* names, even for skills that don't exist yet (Phase 4)
- Agent references (attachment-documenter) use generic names
- External tool references (acli, .mobilecli cache) kept as-is
- Full rewrite of each skill from scratch, based on the original's intent and behavior
- Trigger-optimized descriptions: "Use when..." pattern
- Remove $ARGUMENTS (old command format) -- keep inline argument documentation in the skill body
- No comments in generated code (per global CLAUDE.md)
- Plan 1 (wave 1): pr-read, pr-qa, pr-submit, task-github
- Plan 2 (wave 2): catchup, release-create, track-summary, mobile-reset
- Sequential: Plan 1 establishes the conversion pattern, Plan 2 follows it

### Claude's Discretion
- Exact content structure and formatting per skill (step-based vs template-based vs hybrid)
- Frontmatter fields beyond name and description (allowed-tools, disable-model-invocation, etc.)
- How to handle the "Codebase Analysis" and "Implementation Plan" sections in task-github (may be heavy for a skill)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-01 | All 8 simple items converted to SKILL.md + frontmatter format | SKILL.md spec documented, frontmatter fields catalogued, reference patterns from doctor/update, original source content analyzed, naming mapping locked |
</phase_requirements>

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| SKILL.md format | Agent Skills spec | Skill definition file | Claude Code native skill format |
| YAML frontmatter | Standard YAML | Skill metadata (name, description, etc.) | Required by Claude Code for skill discovery |
| Markdown body | Standard MD | Skill instructions | Claude Code reads and follows as instructions |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `${CLAUDE_SKILL_DIR}` | Path to skill's own directory | In bash commands within SKILL.md that need to reference co-located files |
| `$ARGUMENTS` / `$0`, `$1` | User-provided arguments | When skill needs positional input (CONTEXT says remove `$ARGUMENTS` and use inline docs instead) |
| `disable-model-invocation` | Prevent auto-triggering | For skills with side effects (pr-submit, release-create) |
| `allowed-tools` | Pre-approve tools | When skill needs specific tools without per-use approval |
| `argument-hint` | Autocomplete hint | Show expected arguments after skill name |

### Not Needed for This Phase
| Feature | Why Not |
|---------|---------|
| `context: fork` | These skills run inline, not in subagents |
| `scripts/` directory | Simple skills have no helper scripts |
| `references/` directory | All content fits in SKILL.md under 500 lines |
| `model` field | Default model is fine for all 8 skills |
| `user-invocable: false` | All 8 skills are user-invocable |

## Architecture Patterns

### Skill Directory Structure
```
skills/
├── catchup/SKILL.md
├── task-github/SKILL.md
├── pr-read/SKILL.md
├── pr-qa/SKILL.md
├── pr-submit/SKILL.md
├── release-create/SKILL.md
├── track-summary/SKILL.md
└── mobile-reset/SKILL.md
```

Each skill is a single SKILL.md file in its own directory. No supporting files needed for these 8 simple skills.

### Pattern 1: Frontmatter Structure
**What:** Every SKILL.md starts with YAML frontmatter between `---` markers.
**When to use:** Always -- required for Claude Code to discover the skill.
**Example (from existing doctor skill):**
```yaml
---
name: doctor
description: Check health of all tb plugin components
disable-model-invocation: true
---
```

### Pattern 2: Description as Trigger Optimizer
**What:** Description field uses "Use when..." phrasing to maximize trigger accuracy.
**When to use:** Always -- descriptions power both auto-discovery and SessionStart hook listing.
**Key insight from official docs:** Use "pushy" phrasing to combat undertriggering. "Use whenever the user mentions X" rather than "Use when they ask for X."
**Example (from existing qa-description skill):**
```yaml
description: Use when writing or updating PR descriptions that need QA testing instructions, or when the user asks to add QA steps to a pull request
```

### Pattern 3: Disable Model Invocation for Side-Effect Skills
**What:** Set `disable-model-invocation: true` for skills that perform destructive or externally-visible actions.
**When to use:** pr-submit (creates branches, commits, pushes, creates PRs), release-create (creates branches, bumps versions, pushes).
**Why:** Prevents Claude from auto-triggering skills that modify git state or create PRs. User must invoke with `/tb:pr-submit` explicitly.
**Do NOT use for:** pr-read, pr-qa, task-github, catchup, track-summary, mobile-reset -- these are safe for auto-invocation or are read-only.

### Pattern 4: Cross-Skill References
**What:** Skills reference other plugin skills using `/tb:skill-name` syntax.
**When to use:** When one skill's workflow calls another skill.
**Example:** pr-submit references `/tb:task-jira` and `/tb:pr-describe` (both Phase 4 -- accept the gap).
**Key insight:** Use the new names even for skills that don't exist yet. The content should be correct for the final state.

### Pattern 5: Agent References
**What:** Skills that need image/attachment processing reference the `attachment-documenter` agent by generic name.
**When to use:** task-github and pr-read both reference this agent for image handling.
**Key insight:** Claude Code resolves agents from the plugin's `agents/` directory. The attachment-documenter agent exists at `~/.claude/skills/attachment-documenter/` currently but will be migrated to the plugin's `agents/` directory in a later phase. For now, reference by name and let Claude resolve it.

### Anti-Patterns to Avoid
- **Keeping `$ARGUMENTS` literally:** Old command format. Remove it, document arguments inline in the skill body instead. Arguments are appended automatically if `$ARGUMENTS` is not present.
- **Descriptions that are too generic:** "Helps with PRs" will trigger on everything PR-related. Be specific: "Use when reading and summarizing a GitHub pull request by number or URL."
- **Exceeding 500 lines:** Official recommendation is to keep SKILL.md under 500 lines. daily-summary (track-summary) is the largest at ~160 lines -- well within limits.
- **Using `${CLAUDE_PLUGIN_ROOT}` in SKILL.md content:** This variable does NOT resolve in SKILL.md markdown. Only `${CLAUDE_SKILL_DIR}` works in SKILL.md bash commands.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill discovery | Custom registration system | SessionStart hook + frontmatter scanning | Already built in Phase 2, auto-discovers from `skills/*/SKILL.md` |
| Skill validation | Manual frontmatter checking | `scripts/checks/skills-valid.sh` | Already checks for SKILL.md existence and `name:` field |
| Argument parsing | Custom argument handling code | Claude's built-in argument injection | If `$ARGUMENTS` not present in content, Claude appends `ARGUMENTS: <value>` automatically |
| Trigger matching | Keyword lists in skills | Description-based auto-discovery | Claude matches descriptions to user intent natively |

## Common Pitfalls

### Pitfall 1: Forgetting disable-model-invocation on Dangerous Skills
**What goes wrong:** Claude auto-triggers pr-submit or release-create based on conversation context, creating branches/PRs without user intent.
**Why it happens:** By default all skills are model-invocable. Side-effect skills need explicit opt-out.
**How to avoid:** Set `disable-model-invocation: true` on pr-submit and release-create.
**Warning signs:** Skills with git push, branch creation, or PR creation in their steps.

### Pitfall 2: Stale Cross-References
**What goes wrong:** Skills reference `/jira` or `/pr-description` (old names) instead of `/tb:task-jira` or `/tb:pr-describe`.
**Why it happens:** Copy-pasting from original sources without updating references.
**How to avoid:** Search-and-replace all skill references to use `/tb:` prefix with new names.
**Warning signs:** Any `/` reference without the `tb:` prefix (except built-in commands like `/compact`).

### Pitfall 3: Bloated Descriptions
**What goes wrong:** Description exceeds 1024 character limit or is so long it dilutes trigger matching.
**Why it happens:** Trying to explain the entire skill in the description field.
**How to avoid:** Keep descriptions under 200 characters. Focus on trigger conditions, not implementation details.
**Warning signs:** Description contains step-by-step instructions or examples.

### Pitfall 4: mobile-reset Asking About Non-Existent Environments
**What goes wrong:** The original reset-app-data skill has hardcoded Liverpool FC bundle IDs as examples.
**Why it happens:** Original was written for a specific project.
**How to avoid:** Rewrite to be project-agnostic -- read from the current project's config files, don't hardcode bundle IDs.

### Pitfall 5: daily-summary (track-summary) Identity Detection Fragility
**What goes wrong:** Git identity detection cascade is complex and fragile.
**Why it happens:** Multiple git config scopes, GitHub usernames, email aliases.
**How to avoid:** Preserve the full identity cascade from the original, including the "identity snowball" pattern.

### Pitfall 6: Name/Directory Mismatch
**What goes wrong:** Directory is named `github-task` but frontmatter says `name: task-github`. SessionStart hook reads the `name:` field but skills-valid.sh checks directory structure.
**Why it happens:** Confusion between old names and new names.
**How to avoid:** Directory name MUST match the `name:` field in frontmatter exactly.

## Code Examples

### Minimal SKILL.md (catchup pattern)
```yaml
---
name: catchup
description: Use when building context on current branch work, catching up on what was done, or understanding changes since branching from the base branch
---

# Catchup

Build context on what work has been done on the current branch.

## Steps

1. **Setup**: Fetch latest from origin...
[rest of instructions]
```

### Side-Effect Skill with disable-model-invocation (pr-submit pattern)
```yaml
---
name: pr-submit
description: Use when committing current work, creating a feature branch for a Jira ticket, pushing, and opening a PR. Triggers on "ship", "create PR for ticket", or when work is ready to submit.
disable-model-invocation: true
---

# Ship Ticket

Package current work into a feature branch, commit, push, and open a PR.

## Flow

1. **Get Jira ticket** -- use argument if provided, otherwise ask user
2. **Read ticket context** -- invoke /tb:task-jira
[rest of instructions]
```

### Skill with Cross-References
```yaml
---
name: pr-read
description: Use when reading and summarizing a GitHub pull request, reviewing PR details, or when a PR number or URL is mentioned
---

# Read Pull Request

[instructions]

## Handling Images and Attachments

If images found, invoke the attachment-documenter agent via Task tool...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` | `.claude/skills/*/SKILL.md` | Claude Code merged commands into skills | Skills add frontmatter, supporting files, invocation control |
| `$ARGUMENTS` literal in body | Arguments auto-appended if not referenced | Current SKILL.md spec | Can omit `$ARGUMENTS` and arguments are still available |
| Flat markdown files | YAML frontmatter + markdown body | Agent Skills spec | Enables discovery, tool restrictions, model selection |
| Manual `/command-name` only | Auto-discovery from description | Current Claude Code | Skills trigger automatically when description matches user intent |

**Key change:** Claude Code now supports `argument-hint` field for autocomplete hints, but the CONTEXT.md decision says to remove `$ARGUMENTS` and use inline documentation instead. This is compatible -- `argument-hint` is for autocomplete UI only, not content injection.

## Open Questions

1. **attachment-documenter agent location during Phase 3**
   - What we know: The agent currently lives at `~/.claude/skills/attachment-documenter/SKILL.md`. It will be migrated to the plugin's `agents/` directory in a later phase. task-github and pr-read reference it.
   - What's unclear: Whether Claude Code can resolve the agent by name when it's in `~/.claude/skills/` (personal scope) while the skill invoking it is in the plugin scope.
   - Recommendation: Reference by generic name in the skill body ("invoke the attachment-documenter agent"). Claude should resolve it from whichever location it exists in. If this doesn't work during testing, it's a Phase 4 concern since the agent itself is complex.

2. **argument-hint field**
   - What we know: SKILL.md spec supports `argument-hint` for autocomplete UI.
   - What's unclear: Whether this is cosmetic-only or affects behavior.
   - Recommendation: Add `argument-hint` for skills that take arguments (task-github, pr-read, pr-submit, release-create, track-summary, mobile-reset) to improve UX. E.g., `argument-hint: "[issue-number-or-url]"`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | /skill-creator (Claude Code built-in) + bash check scripts |
| Config file | scripts/checks/skills-valid.sh (exists) |
| Quick run command | `bash scripts/checks/skills-valid.sh .` |
| Full suite command | `/tb:doctor` (runs all check scripts) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-01-a | All 8 SKILL.md files exist with proper frontmatter | unit | `bash scripts/checks/skills-valid.sh .` | Yes |
| MIGR-01-b | Each skill invocable from Claude Code | manual-only | Invoke `/tb:skill-name` in Claude Code session | N/A |
| MIGR-01-c | Behavior equivalence with original | manual-only | `/skill-creator` benchmarking per config.json | N/A |
| MIGR-01-d | Original items removable without functionality loss | manual-only | Remove originals, test each `/tb:skill-name` | N/A |
| MIGR-01-e | Correct frontmatter fields | unit | `bash scripts/checks/skills-valid.sh .` | Yes |

**Manual-only justification:** Skill behavior verification requires an interactive Claude Code session. The `/skill-creator` workflow (per config.json `skill_creator_verification: true`) handles this via its benchmark pipeline with parallel subagent evaluations.

### Sampling Rate
- **Per task commit:** `bash scripts/checks/skills-valid.sh .`
- **Per wave merge:** `/tb:doctor` + manual invocation test of each new skill
- **Phase gate:** All 8 skills pass skills-valid.sh + `/skill-creator` verification

### Wave 0 Gaps
None -- existing test infrastructure (skills-valid.sh) already validates SKILL.md presence and frontmatter name field. No new test tooling needed.

## Sources

### Primary (HIGH confidence)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) - Complete frontmatter reference, invocation control, argument handling, supporting files, discovery behavior
- [SKILL.md Format Specification (DeepWiki)](https://deepwiki.com/anthropics/skills/2.2-skill.md-format-specification) - Validation rules, allowed keys, format constraints
- Existing skills in repo: `skills/doctor/SKILL.md`, `skills/update/SKILL.md` - Proven patterns for this specific plugin

### Secondary (MEDIUM confidence)
- [Skill Creator Workflow (DeepWiki)](https://deepwiki.com/anthropics/skills/4.1-skill-creator-workflow) - 11-phase workflow for skill creation, benchmarking, and verification
- [Anthropic Skills Repo](https://github.com/anthropics/skills) - Reference implementations and spec

### Tertiary (LOW confidence)
- None -- all findings verified against official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Claude Code docs specify exact SKILL.md format and frontmatter fields
- Architecture: HIGH - Two working reference skills already exist in the plugin, patterns proven
- Pitfalls: HIGH - Derived from official docs (description limits, invocation control) and project-specific context (naming conventions, cross-references)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable -- SKILL.md spec is mature)
