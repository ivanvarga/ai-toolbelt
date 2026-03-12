# Phase 6: Global Config + Verification - Research

**Researched:** 2026-03-12
**Domain:** Plugin config distribution, skill verification via /skill-creator
**Confidence:** HIGH

## Summary

Phase 6 has two distinct workstreams: (1) distributing the global CLAUDE.md via the plugin, and (2) verifying all 18 skills pass /skill-creator benchmarking. Both are straightforward implementations that follow well-established patterns already in the codebase.

The global config workstream involves creating `config/CLAUDE.md` (copying from `~/.claude/CLAUDE.md`), adding a copy step to the update skill, creating a doctor check script, and documenting the install step. The verification workstream is sequential -- run /skill-creator on each skill, fix failures, re-verify.

**Primary recommendation:** Split into 3 plans: (1) global config distribution infrastructure, (2) README + install docs update, (3) skill verification and fixes.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Source file lives at `config/CLAUDE.md` in the plugin repo (separate from repo's own CLAUDE.md which has plugin dev instructions)
- Install script and /tb:update both copy `config/CLAUDE.md` to `~/.claude/CLAUDE.md`
- Overwrite with warning if `~/.claude/CLAUDE.md` already exists (no backup, no skip -- this is a personal toolkit)
- No SessionStart hook injection for global config -- avoids context window overhead
- Single source of truth: edit in plugin repo, push, then /tb:update propagates
- Distribute the current global CLAUDE.md as-is, including React Native/Expo debugging section
- No additions for plugin awareness -- SessionStart hook already handles that separately
- No splitting or conditional inclusion -- one file, all content
- Verify all 18 skills (16 converted + doctor + update) via /skill-creator
- One at a time, fix as you go -- verify, fix if needed, re-verify, move to next
- Pass criteria: /skill-creator's own built-in verification and benchmarking output
- Fix scope: only fix what /skill-creator flags -- no opportunistic refactoring
- /tb:update always copies config/CLAUDE.md to ~/.claude/CLAUDE.md after pulling latest
- /tb:doctor gets a new check script that compares config/CLAUDE.md against ~/.claude/CLAUDE.md (PASS if identical, FAIL with fix instructions)
- README install docs updated to mention CLAUDE.md distribution

### Claude's Discretion
- Exact implementation of the CLAUDE.md copy step in update skill and install docs
- Order of skill verification (which skills first)
- Doctor check script implementation details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Global CLAUDE.md distributed via plugin | config/CLAUDE.md source file, update skill copy step, doctor check, README install docs |
| MIGR-05 | Each converted skill verified via /skill-creator benchmarking | Sequential /skill-creator verification of all 18 skills with fix-as-you-go approach |

</phase_requirements>

## Standard Stack

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| bash (cp/diff) | File copy and comparison | Already used in all check scripts, no dependencies |
| python3 | JSON parsing in check scripts | Already established pattern in existing checks |
| /skill-creator | Skill verification and benchmarking | Project config explicitly requires this (`skill_creator_verification: true`) |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `${CLAUDE_SKILL_DIR}` | Resolve skill directory in SKILL.md | Update skill's CLAUDE.md copy step |
| `${CLAUDE_PLUGIN_ROOT}` | Resolve plugin root in hooks/scripts | Doctor check script |

No new libraries or dependencies needed. This phase uses only bash and existing project infrastructure.

## Architecture Patterns

### File Distribution Pattern
```
config/CLAUDE.md (source of truth in repo)
    |
    ├── /tb:update copies to → ~/.claude/CLAUDE.md (active config)
    ├── Install docs instruct manual copy
    └── /tb:doctor verifies sync via diff
```

### Doctor Check Script Pattern (established)
Every check script in `scripts/checks/` follows this exact contract:
1. Accepts `$1` as plugin root path, defaults to `.`
2. Outputs exactly one line: `PASS|FAIL <check-name> <message>`
3. Always exits 0 (pass/fail communicated via output, not exit code)
4. FAIL messages include fix instructions

Existing examples: `cred-github.sh`, `cred-sentry.sh`, `cred-acli.sh`, `hooks-valid.sh`, `plugin-registered.sh`, `skills-valid.sh`

### Update Skill Step Pattern (established)
The update skill (`skills/update/SKILL.md`) follows a numbered step pattern:
1. Detect environment (cache vs source)
2. Capture current state
3. Stash local changes
4. Pull latest
5. Pop stash
6. Compare versions
7. Show changelog
8. Remind to reload

New CLAUDE.md copy step fits naturally after step 4 (pull) and before step 6 (compare versions).

### Skill Verification Pattern
/skill-creator is an external Claude Code skill (not part of this plugin). It:
- Reads a SKILL.md file
- Verifies structure, frontmatter, content quality
- Runs benchmarking against the skill's intended use case
- Reports pass/fail with specific issues

### Anti-Patterns to Avoid
- **Hook-based config injection:** Decision explicitly says NO SessionStart hook for global config (avoids context window overhead)
- **Backup/merge for existing CLAUDE.md:** Decision says overwrite with warning, no backup -- this is a personal toolkit
- **Opportunistic refactoring during verification:** Fix ONLY what /skill-creator flags

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File comparison | Custom diff parsing | `diff -q` or `cmp -s` | One-liner, reliable |
| Skill verification | Manual checklist | /skill-creator | Has built-in benchmarking, project config requires it |
| JSON parsing in bash | jq or manual parsing | python3 | Established pattern, available on macOS/Linux |

## Common Pitfalls

### Pitfall 1: Update skill step ordering
**What goes wrong:** CLAUDE.md copy runs before git pull, distributing stale config
**Why it happens:** Adding the step in the wrong position in the update skill
**How to avoid:** Insert copy step AFTER step 4 (pull) and step 5 (pop stash), making it step 5.5 or a new numbered step
**Warning signs:** Config file doesn't match after /tb:update

### Pitfall 2: Path resolution in update skill
**What goes wrong:** `~/.claude/CLAUDE.md` doesn't expand correctly in some contexts
**Why it happens:** Tilde expansion depends on shell context
**How to avoid:** Use `$HOME/.claude/CLAUDE.md` instead of `~/.claude/CLAUDE.md` in bash commands
**Warning signs:** File written to literal `~/.claude/` path

### Pitfall 3: Doctor check file comparison
**What goes wrong:** Check reports FAIL when files are identical but have different line endings or trailing whitespace
**Why it happens:** Using string comparison instead of proper file diff
**How to avoid:** Use `cmp -s` for byte-exact comparison or `diff -q` for content comparison
**Warning signs:** False FAIL results on clean installs

### Pitfall 4: Missing config/ directory
**What goes wrong:** The `config/` directory doesn't exist yet in the repo
**Why it happens:** It's a new directory being created in this phase
**How to avoid:** Create `config/` directory and `config/CLAUDE.md` as the first task
**Warning signs:** Copy commands fail with "no such file or directory"

### Pitfall 5: Skill verification scope creep
**What goes wrong:** Fixing more than what /skill-creator flags, touching unrelated code
**Why it happens:** Seeing other issues while reviewing skills
**How to avoid:** Strict discipline -- fix ONLY flagged issues, re-verify, move on
**Warning signs:** Skill changes that don't correspond to /skill-creator output

## Code Examples

### Global Config Check Script (scripts/checks/global-config.sh)
```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

SOURCE="${PLUGIN_ROOT}/config/CLAUDE.md"
TARGET="$HOME/.claude/CLAUDE.md"

if [ ! -f "$SOURCE" ]; then
    echo "FAIL global-config config/CLAUDE.md not found in plugin"
    exit 0
fi

if [ ! -f "$TARGET" ]; then
    echo "FAIL global-config ~/.claude/CLAUDE.md not found. Run: /tb:update"
    exit 0
fi

if cmp -s "$SOURCE" "$TARGET"; then
    echo "PASS global-config Global CLAUDE.md is in sync"
else
    echo "FAIL global-config ~/.claude/CLAUDE.md out of sync. Run: /tb:update"
fi
exit 0
```

### Update Skill CLAUDE.md Copy Step
```bash
cp "${PLUGIN_ROOT}/config/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
```
This is a single cp command. The update skill should print a message like:
`Global CLAUDE.md updated at ~/.claude/CLAUDE.md`

### README Install Section Addition
After the existing install commands, add:
```bash
# Copy global config
PLUGIN_DIR=$(claude plugin dir tb 2>/dev/null || echo "$HOME/.claude/plugins/cache/tb-marketplace/tb/latest")
cp "$PLUGIN_DIR/config/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
```
Or simpler: just document that /tb:update handles this, since the user runs it after install anyway.

## Implementation Details

### 18 Skills to Verify (in suggested order)

**Simple skills first (no supporting files, no credentials):**
1. catchup
2. pr-read
3. pr-qa
4. task-github
5. mobile-reset
6. track-summary
7. release-create
8. pr-submit

**Skills with supporting files or credentials:**
9. pr-upload (has setup.js, references github-api.js)
10. sentry-investigate (has setup.js, references sentry-api.js)
11. sentry-sourcemaps (references sentry-api.js)
12. task-jira (has setup.js, references acli)
13. figma-component (references mobilecli)
14. pr-describe (orchestrator skill)
15. contentful (has setup.js, large SKILL.md)
16. mobilecli (has test-helpers.sh, DEBUG-MODE.md)

**Infrastructure skills:**
17. doctor
18. update

**Rationale:** Simple skills first to build momentum. Complex skills next when the pattern is clear. Infrastructure skills last since they may change during this phase (update gets the CLAUDE.md copy step).

### Global CLAUDE.md Content
The current `~/.claude/CLAUDE.md` content (73 lines) is the exact content to place in `config/CLAUDE.md`. It includes:
- Communication Style
- Knowledge Staleness rules
- Security Rules
- Verification Rules
- Code Style & Patterns
- Git Commit Guidelines
- React Native / Expo Debugging

No modifications needed -- decision says "distribute as-is."

### config/ Directory
This is a new directory at the repo root. Only contains `CLAUDE.md` for now. Consistent with the existing flat directory structure (skills/, agents/, hooks/, tools/, scripts/).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | /skill-creator (external Claude Code skill) |
| Config file | .planning/config.json (`skill_creator_verification: true`) |
| Quick run command | Invoke /skill-creator on individual SKILL.md |
| Full suite command | Sequential /skill-creator on all 18 skills |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | config/CLAUDE.md exists in repo | manual | `test -f config/CLAUDE.md` | N/A (new file) |
| CONF-01 | Update skill copies config to ~/.claude/ | manual | Run /tb:update, verify file | N/A (SKILL.md change) |
| CONF-01 | Doctor check detects sync/desync | manual | Run /tb:doctor | N/A (new script) |
| MIGR-05 | All 18 skills pass /skill-creator | manual | /skill-creator per skill | Skills exist |

### Sampling Rate
- **Per task commit:** Run affected doctor check or /skill-creator verification
- **Per wave merge:** Run /tb:doctor for full check suite
- **Phase gate:** All 18 skills pass /skill-creator, /tb:doctor shows all PASS

### Wave 0 Gaps
- [ ] `config/CLAUDE.md` -- source file (copy from ~/.claude/CLAUDE.md)
- [ ] `scripts/checks/global-config.sh` -- doctor check for config sync

## Open Questions

1. **Install flow for cache-based installs**
   - What we know: README shows `claude plugin marketplace add` + `claude plugin install` flow. Update skill detects cache vs source.
   - What's unclear: For cache-based installs, does the plugin cache include the `config/` directory automatically? The update skill's cache path handles this by directing users to `claude plugin update` instead.
   - Recommendation: Document that after `claude plugin install`, users should run `/tb:update` which handles the CLAUDE.md copy. For cache installs, the file is already in the plugin directory.

2. **What /skill-creator checks exactly**
   - What we know: It's an external skill referenced in project config. It verifies and benchmarks skills.
   - What's unclear: The exact verification criteria and benchmarking methodology (it's not part of this repo).
   - Recommendation: Run it on first skill and observe output to understand criteria. Fix-as-you-go approach handles this naturally.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All 7 existing check scripts in `scripts/checks/` examined for pattern
- Codebase analysis: `skills/update/SKILL.md` examined for step pattern
- Codebase analysis: `skills/doctor/SKILL.md` examined for check discovery pattern
- Codebase analysis: All 18 skill directories verified present with valid SKILL.md files
- `~/.claude/CLAUDE.md` content verified (73 lines, exact content for distribution)
- `.planning/config.json` confirms `skill_creator_verification: true`

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions on implementation approach (user-confirmed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established in codebase
- Architecture: HIGH -- follows existing doctor check and update skill patterns exactly
- Pitfalls: HIGH -- derived from direct codebase analysis, not external sources

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable -- no external dependencies to go stale)
