# Phase 6: Global Config + Verification - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Distribute the global CLAUDE.md via the plugin (copy to ~/.claude/ on install and update) and verify all 18 skills pass /skill-creator benchmarking. Fix any skills that fail verification.

</domain>

<decisions>
## Implementation Decisions

### Global CLAUDE.md delivery
- Source file lives at `config/CLAUDE.md` in the plugin repo (separate from repo's own CLAUDE.md which has plugin dev instructions)
- Install script and /tb:update both copy `config/CLAUDE.md` to `~/.claude/CLAUDE.md`
- Overwrite with warning if `~/.claude/CLAUDE.md` already exists (no backup, no skip — this is a personal toolkit)
- No SessionStart hook injection for global config — avoids context window overhead
- Single source of truth: edit in plugin repo, push, then /tb:update propagates

### Config content scope
- Distribute the current global CLAUDE.md as-is, including React Native/Expo debugging section
- No additions for plugin awareness — SessionStart hook already handles that separately
- No splitting or conditional inclusion — one file, all content

### Skill verification strategy
- Verify all 18 skills (16 converted + doctor + update) via /skill-creator
- One at a time, fix as you go — verify, fix if needed, re-verify, move to next
- Pass criteria: /skill-creator's own built-in verification and benchmarking output
- Fix scope: only fix what /skill-creator flags — no opportunistic refactoring

### Update propagation
- /tb:update always copies config/CLAUDE.md to ~/.claude/CLAUDE.md after pulling latest
- /tb:doctor gets a new check script that compares config/CLAUDE.md against ~/.claude/CLAUDE.md (PASS if identical, FAIL with fix instructions)
- README install docs updated to mention CLAUDE.md distribution

### Claude's Discretion
- Exact implementation of the CLAUDE.md copy step in update skill and install docs
- Order of skill verification (which skills first)
- Doctor check script implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hooks/session-start.sh`: already injects skill listing, pattern for hook-based content delivery (not used for CLAUDE.md but informs the approach)
- `skills/update/SKILL.md`: existing update skill that needs the CLAUDE.md copy step added
- `skills/doctor/SKILL.md`: existing doctor skill with drop-in check pattern
- `scripts/checks/*.sh`: doctor check scripts (cred-github.sh, cred-sentry.sh, etc.) — pattern for new global-config check

### Established Patterns
- Doctor discovers checks via `ls scripts/checks/*.sh` — new check drops in automatically
- /tb:update pulls git changes — CLAUDE.md copy is a post-pull step
- Check scripts output PASS|FAIL and accept $1 as plugin root

### Integration Points
- Install flow (README): needs CLAUDE.md copy step documented
- /tb:update skill: needs config/CLAUDE.md → ~/.claude/CLAUDE.md copy step
- /tb:doctor: new scripts/checks/global-config.sh for sync verification
- /skill-creator: external skill used for verification (not part of this plugin)

</code_context>

<specifics>
## Specific Ideas

- The edit workflow is: change config/CLAUDE.md in repo → commit → push → /tb:update on target machine copies it to ~/.claude/
- Doctor check for global config should show the exact command to fix: "Run: /tb:update"
- Verification is sequential to allow immediate fixes — no parallel /skill-creator runs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-global-config-verification*
*Context gathered: 2026-03-12*
