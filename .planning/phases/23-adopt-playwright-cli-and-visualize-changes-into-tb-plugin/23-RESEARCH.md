# Phase 23: Adopt playwright-cli and visualize-changes into tb plugin - Research

**Researched:** 2026-04-11
**Domain:** Claude Code SKILL.md authoring, skill adoption from standalone to plugin, subagent-based skills
**Confidence:** HIGH

## Summary

This phase copies two standalone skills from `~/.claude/skills/` into the tb plugin's `skills/` directory, renames them (`playwright-cli` -> `tb:browser`, `visualize-changes` -> `tb:change-map`), and polishes them to match tb conventions. The browser skill is a straightforward copy-and-rename with light frontmatter updates. The change-map skill requires deeper improvement: its `<SKILL_DIR>` placeholder pattern needs conversion to `${CLAUDE_SKILL_DIR}`, its subagent prompt template has embedded `BASE` placeholders that need proper variable substitution, and the overall skill quality should be improved via the skill-creator workflow.

The source materials are well-defined: playwright-cli is 278 lines of SKILL.md + 7 reference docs (1033 lines total) + `allowed-tools: Bash(playwright-cli:*)`. Visualize-changes is 160 lines of SKILL.md + 2 Node.js scripts (480 lines total) with a subagent delegation pattern. Both skills are self-contained with supporting files in subdirectories, matching the tb plugin's established pattern of skill-local supporting files.

**Primary recommendation:** Two plans -- Plan 1: copy, rename, and polish `tb:browser` (light touch); Plan 2: copy, rename, and deeply improve `tb:change-map` via skill-creator workflow. Both are independent and could run in either order.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: `playwright-cli` becomes `tb:browser` -- generic capability name, directory `skills/browser/`
- D-02: `visualize-changes` becomes `tb:change-map` -- matches the skill's output concept, directory `skills/change-map/`
- D-03: `tb:browser` gets light polish only -- rename frontmatter, fix path references, review description for tb consistency, fix any obvious issues
- D-04: `tb:change-map` gets deeper improvement via skill-creator workflow -- address known issues, improve quality, all within this phase
- D-05: Both skills delivered in final form when phase completes
- D-06: Remove original standalone skills from `~/.claude/skills/` after tb versions confirmed working
- D-07: Cleanup is manual -- user runs `rm -rf ~/.claude/skills/playwright-cli/ ~/.claude/skills/visualize-changes/` after verification
- D-08: No automated cleanup in install.sh or bootstrap
- D-09: Supporting files stay inside their skill directories (self-contained)
- D-10: `tb:browser` keeps `references/` subdir with all 7 markdown docs
- D-11: `tb:change-map` keeps `scripts/` subdir with `file-deps.mjs` and `symbol-map.mjs`
- D-12: `${CLAUDE_SKILL_DIR}` used for all path references within SKILL.md

### Claude's Discretion
- Exact wording of polished descriptions
- Specific issues to fix in tb:change-map during skill-creator pass
- Order of operations (browser first vs change-map first)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| SKILL.md | Plugin frontmatter v1 | Skill definition with name, description, optional allowed-tools | Established plugin pattern (21 existing skills) |
| playwright-cli | 1.59.0-alpha | Browser automation CLI | Already installed globally, skill wraps it |
| Node.js | v24.12.0 | Runtime for change-map scripts | Available on machine, scripts use ESM imports |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `${CLAUDE_SKILL_DIR}` | Path variable for skill-local file references | All bash commands in SKILL.md that reference supporting files |
| `scripts/checks/skills-valid.sh` | Validates skill directory structure and frontmatter | Doctor check, verifies SKILL.md exists with `name:` field |
| Agent tool | Subagent delegation for change-map generation | Used by tb:change-map to keep main conversation clean |

## Architecture Patterns

### Skill Directory Structure

```
skills/browser/
  SKILL.md                          # ~280 lines, playwright-cli reference
  references/
    request-mocking.md              # 87 lines
    running-code.md                 # 232 lines
    session-management.md           # 169 lines
    storage-state.md                # 275 lines
    test-generation.md              # 88 lines
    tracing.md                      # 139 lines
    video-recording.md              # 43 lines

skills/change-map/
  SKILL.md                          # ~160 lines (before improvement), subagent-based
  scripts/
    file-deps.mjs                   # 326 lines, file dependency graph generator
    symbol-map.mjs                  # 154 lines, symbol map generator
```

### Pattern 1: SKILL.md Frontmatter Convention
**What:** Every tb skill has YAML frontmatter with `name: tb:<skill-name>`, `description:`, and optional `allowed-tools:`
**When to use:** Every skill in the plugin

Example from existing `tb:catchup`:
```yaml
---
name: tb:catchup
description: Use when building context on current branch work...
---
```

Example for `tb:browser` (new):
```yaml
---
name: tb:browser
description: Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, test web applications, or extract information from web pages. Automates browser interactions via playwright-cli.
allowed-tools: Bash(playwright-cli:*)
---
```

Example for `tb:change-map` (new):
```yaml
---
name: tb:change-map
description: Use when the user asks to visualize changes, map a diff, create a change diagram, review what changed, or wants to understand the impact of changes visually. Generates mermaid diagrams for PR descriptions.
---
```

### Pattern 2: Path Variable Usage
**What:** `${CLAUDE_SKILL_DIR}` resolves to the skill's subdirectory at runtime
**When to use:** Any bash command in SKILL.md that references supporting files

The visualize-changes skill currently uses `<SKILL_DIR>` as a literal placeholder with instructions to "Replace with the absolute path". This must be converted to:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/file-deps.mjs"
node "${CLAUDE_SKILL_DIR}/scripts/symbol-map.mjs"
```

### Pattern 3: Subagent Delegation
**What:** The change-map skill spawns a subagent via Agent tool to do heavy work
**When to use:** When the skill's output is a large artifact and the main conversation should stay clean

The current visualize-changes skill embeds the entire subagent prompt as a template in the SKILL.md. This pattern works but has issues that the skill-creator improvement should address:
- The prompt uses `BASE` as a literal placeholder instead of proper variable substitution
- Script path references use `<SKILL_DIR>` placeholder
- GSD-specific conventions referenced that don't apply in tb context

### Pattern 4: Reference File Links
**What:** SKILL.md links to reference docs using markdown relative paths
**When to use:** When a skill has supplementary documentation

The playwright-cli skill uses relative paths to reference docs:
```markdown
* **Request mocking** [references/request-mocking.md](references/request-mocking.md)
```
These relative paths work within the skill directory. No change needed for tb adoption since the references/ dir is copied alongside SKILL.md.

### Anti-Patterns to Avoid
- **Hardcoded absolute paths:** Never use `~/.claude/skills/...` paths in tb skill content. Use `${CLAUDE_SKILL_DIR}` for skill-local files.
- **`<PLACEHOLDER>` instructions:** Don't tell Claude to "Replace X with Y". Use `${CLAUDE_SKILL_DIR}` which resolves automatically.
- **Missing `tb:` prefix:** All skill names MUST have the `tb:` prefix in frontmatter.
- **Directory name mismatch:** Directory name must match the skill name minus the `tb:` prefix (e.g., `tb:browser` -> `skills/browser/`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill validation | Custom validation scripts | `bash scripts/checks/skills-valid.sh .` | Already checks SKILL.md existence and frontmatter name field |
| Path resolution | Hardcoded paths or placeholder instructions | `${CLAUDE_SKILL_DIR}` variable | Automatically resolves at runtime, works in plugin cache |
| Skill verification | Manual testing only | `/skill-creator` workflow | Config requires skill_creator_verification; benchmarks skill quality |

## Common Pitfalls

### Pitfall 1: Forgetting `tb:` Prefix in Frontmatter
**What goes wrong:** Skill registered without `tb:` prefix, invoked as `/browser` instead of `/tb:browser`
**Why it happens:** Source skills don't have the prefix
**How to avoid:** Always set `name: tb:browser` and `name: tb:change-map` in frontmatter
**Warning signs:** `skills-valid.sh` won't catch this (it only checks `name:` exists), so verify manually

### Pitfall 2: `<SKILL_DIR>` Placeholder Not Converted
**What goes wrong:** Subagent prompt still contains `<SKILL_DIR>` literal, Claude doesn't know the actual path
**Why it happens:** Copy-paste from source without updating path references
**How to avoid:** Search-and-replace all `<SKILL_DIR>` with `${CLAUDE_SKILL_DIR}` in SKILL.md bash blocks
**Warning signs:** Grep for `<SKILL_DIR>` in the output files

### Pitfall 3: `BASE` Placeholder in Subagent Prompt
**What goes wrong:** Git commands in the subagent prompt contain literal `BASE` instead of an actual branch name
**Why it happens:** The visualize-changes SKILL.md embeds the subagent prompt as a template with `BASE` as a placeholder. The outer skill is supposed to substitute it, but the instruction to do so is implicit.
**How to avoid:** The skill-creator improvement should restructure the subagent prompt so the base branch is discovered inside the prompt (Phase 1a already does this) and the result is used directly in subsequent commands via variable, not placeholder substitution.
**Warning signs:** Git commands with literal `BASE` in them instead of branch refs

### Pitfall 4: Scripts Only Handle TS/TSX Files
**What goes wrong:** `file-deps.mjs` and `symbol-map.mjs` skip non-TypeScript files (they filter for `.ts`/`.tsx`)
**Why it happens:** Scripts were built for a TypeScript-heavy workflow
**How to avoid:** This is a known limitation, not a bug. The skill-creator improvement could note this in the SKILL.md or optionally extend the scripts, but it's not blocking for adoption.
**Warning signs:** "No changed TS/TSX files found" when used on non-TS repos

### Pitfall 5: Reference Doc Relative Paths
**What goes wrong:** Links to reference docs break if the directory structure changes
**Why it happens:** SKILL.md uses relative markdown paths like `references/request-mocking.md`
**How to avoid:** Keep the `references/` directory alongside SKILL.md (D-10 confirms this). Don't restructure.
**Warning signs:** Broken links when Claude tries to read reference docs

## Code Examples

### tb:browser Frontmatter (target state)
```yaml
---
name: tb:browser
description: Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, test web applications, or extract information from web pages. Automates browser interactions via playwright-cli.
allowed-tools: Bash(playwright-cli:*)
---
```

### tb:change-map Script References (target state)
```bash
node "${CLAUDE_SKILL_DIR}/scripts/file-deps.mjs"
node "${CLAUDE_SKILL_DIR}/scripts/symbol-map.mjs"
```

### Existing tb Skill Frontmatter (reference)
From `skills/mbridge/SKILL.md`:
```yaml
---
name: tb:mbridge
description: Use when interacting with mobile apps on iOS simulators, Android emulators, or real devices...
allowed-tools: Bash(mbridge:*)
---
```

## tb:browser -- Changes Required (Light Polish)

| Area | Current (playwright-cli) | Target (tb:browser) | Effort |
|------|-------------------------|---------------------|--------|
| Frontmatter `name:` | `playwright-cli` | `tb:browser` | Trivial |
| Frontmatter `description:` | Long, starts with "Automates browser..." | "Use when..." trigger pattern per tb convention | Minor rewrite |
| Frontmatter `allowed-tools:` | `Bash(playwright-cli:*)` | `Bash(playwright-cli:*)` (unchanged) | None |
| Title | "Browser Automation with playwright-cli" | "Browser Automation" or "Browser" | Trivial |
| Path references | None (uses relative links to `references/`) | None needed (relative links work) | None |
| Reference docs | 7 files in `references/` | Copy as-is (D-10) | Copy only |
| Content body | 278 lines of comprehensive CLI docs | Review for obvious issues, otherwise keep | Light review |

Total: ~15 minutes of work. Straightforward copy + frontmatter update + description polish.

## tb:change-map -- Issues to Address (Deeper Improvement)

| Issue | Description | Severity |
|-------|-------------|----------|
| `<SKILL_DIR>` placeholder | SKILL.md uses `<SKILL_DIR>` with manual substitution instruction | HIGH -- blocks correct execution |
| `BASE` placeholder in git commands | Subagent prompt template uses literal `BASE` in git commands | HIGH -- breaks if not substituted |
| No `tb:` prefix | Frontmatter name is `visualize-changes` | HIGH -- naming convention |
| GSD convention references | Mentions "GSD conventions" in Agent description guidance | LOW -- cosmetic |
| Subagent prompt quality | Long embedded prompt could be clearer, more structured | MEDIUM -- skill-creator scope |
| No `allowed-tools` | Doesn't declare needed tool permissions | LOW -- works without it |
| Description not trigger-optimized | Already good but should follow "Use when..." pattern consistently | LOW |
| TS/TSX-only limitation undocumented | Scripts silently skip non-TS files | LOW -- should be noted |

The skill-creator workflow (D-04) should address all HIGH and MEDIUM issues. LOW issues are optional improvements.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bash check scripts + /skill-creator verification |
| Config file | `scripts/checks/skills-valid.sh` (exists) |
| Quick run command | `bash scripts/checks/skills-valid.sh .` |
| Full suite command | `/tb:doctor` |

### Phase Requirements -> Test Map

No formal requirement IDs for this phase. Validation criteria derived from decisions:

| Criterion | Behavior | Test Type | Automated Command | Exists? |
|-----------|----------|-----------|-------------------|---------|
| D-01 | `skills/browser/SKILL.md` exists with `name: tb:browser` | unit | `bash scripts/checks/skills-valid.sh .` | Wave 0 (covered) |
| D-02 | `skills/change-map/SKILL.md` exists with `name: tb:change-map` | unit | `bash scripts/checks/skills-valid.sh .` | Wave 0 (covered) |
| D-09/D-10 | `skills/browser/references/` contains 7 .md files | unit | `ls skills/browser/references/*.md \| wc -l` | Wave 0 |
| D-09/D-11 | `skills/change-map/scripts/` contains `file-deps.mjs` and `symbol-map.mjs` | unit | `test -f skills/change-map/scripts/file-deps.mjs && test -f skills/change-map/scripts/symbol-map.mjs` | Wave 0 |
| D-12 | No `<SKILL_DIR>` placeholders remain in SKILL.md files | unit | `grep -r '<SKILL_DIR>' skills/browser/ skills/change-map/ && echo FAIL \|\| echo PASS` | Wave 0 |
| D-03 | `tb:browser` frontmatter has `allowed-tools: Bash(playwright-cli:*)` | unit | `grep 'allowed-tools:' skills/browser/SKILL.md` | Wave 0 |
| D-04 | `tb:change-map` quality improved | manual-only | `/skill-creator` benchmarking | N/A |

**Manual-only justification:** Skill quality/behavior verification requires interactive Claude Code sessions and /skill-creator benchmarking per config.json `skill_creator_verification: true`.

### Sampling Rate
- **Per task commit:** `bash scripts/checks/skills-valid.sh .`
- **Per wave merge:** `/tb:doctor` + verify no `~/.claude/skills/` hardcoded paths + grep for `<SKILL_DIR>` placeholders
- **Phase gate:** Both skills pass skills-valid.sh + `/skill-creator` verification for tb:change-map

### Wave 0 Gaps
None -- existing `skills-valid.sh` covers SKILL.md presence and frontmatter validation. Additional checks (reference file counts, placeholder grep) are inline verifications in task steps.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| playwright-cli | tb:browser skill | Yes | 1.59.0-alpha | npx playwright-cli |
| Node.js | change-map scripts | Yes | v24.12.0 | -- |
| git | Both skills (diff analysis) | Yes | -- | -- |

No missing dependencies.

## Sources

### Primary (HIGH confidence)
- Source skill files: `~/.claude/skills/playwright-cli/SKILL.md` (278 lines, read in full)
- Source skill files: `~/.claude/skills/visualize-changes/SKILL.md` (160 lines, read in full)
- Existing tb skills: `skills/catchup/SKILL.md`, `skills/mbridge/SKILL.md`, `skills/pr-describe/SKILL.md` (frontmatter pattern reference)
- Plugin CLAUDE.md: Skill naming convention, path variables, directory structure
- Phase 4 research: Complex skill conversion patterns, established during prior adoption work
- `scripts/checks/skills-valid.sh`: Validation script (43 lines, read in full)

### Secondary (MEDIUM confidence)
- `.planning/config.json`: Confirms `skill_creator_verification: true` and `nyquist_validation: true`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components exist and are verified on this machine
- Architecture: HIGH -- follows established patterns from 21 existing skills, prior adoption phases (3, 4, 10)
- Pitfalls: HIGH -- identified by direct comparison of source skill conventions vs tb plugin conventions

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- plugin conventions and source skills are both local, not affected by external changes)
