# Phase 20: Bootstrap & Update - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 20-bootstrap-update
**Areas discussed:** GSD installation method, forgetful-plugin source, Update skill expansion, Idempotency behavior

---

## GSD Installation Method

| Option | Description | Selected |
|--------|-------------|----------|
| Guide user through installer | Tell user to run GSD installer manually, verify after | ✓ |
| Run installer non-interactively | Shell out with flags to skip prompts | |
| Replicate installer steps | Clone repo and set up files directly | |

**User's choice:** Guide user through installer
**Notes:** None

### Follow-up: Verification after install

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect via doctor check | Run gsd-installed.sh check, retry if fails | ✓ |
| Ask user to confirm | Press enter when done, then verify | |

**User's choice:** Auto-detect via doctor check
**Notes:** None

### Follow-up: Outdated GSD handling

| Option | Description | Selected |
|--------|-------------|----------|
| Bootstrap only installs, never updates | Update is /tb:update's job | ✓ |
| Bootstrap also offers to update | Offer update if GSD is old | |

**User's choice:** Bootstrap only installs, never updates
**Notes:** Clean separation of concerns

---

## forgetful-plugin Source

| Option | Description | Selected |
|--------|-------------|----------|
| Git clone to plugin directory | Clone repo, use claude plugin add or direct clone | ✓ |
| Guide user to install | Print steps, let user handle it | |

**User's choice:** Git clone to plugin directory
**Notes:** User clarified: "forgetful server is currently not part of this, just ways to use it, skills" — forgetful-plugin is a Claude Code plugin with skills, not the server itself.

### Follow-up: Repo URL source

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode the repo URL | Embed known URL in bootstrap skill | |
| Discover from Claude settings | Parse settings to find configured plugin path/URL | ✓ |

**User's choice:** Discover from Claude settings
**Notes:** None

---

## Update Skill Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing SKILL.md | Add steps inline to skills/update/SKILL.md | ✓ |
| Call helper scripts from SKILL.md | Shell out to scripts/ for update logic | |
| Separate update skills | Create /tb:update-gsd and /tb:update-forgetful | |

**User's choice:** Extend existing SKILL.md
**Notes:** Single skill, linear flow

### Follow-up: GSD update mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: just run npx install | Run npx directly, skip changelog/confirmation | ✓ |
| Full flow: check + confirm + install | Duplicate /gsd:update's UX | |

**User's choice:** Minimal: just run npx install
**Notes:** User asked to research how GSD wants to be updated. Found GSD uses `npx -y get-shit-done-cc@latest --claude --global` via npm.

### Follow-up: forgetful-plugin update

| Option | Description | Selected |
|--------|-------------|----------|
| Git pull plugin directory | Discover path from settings, run git pull | ✓ |
| Skip if not installed | Only update existing, suggest bootstrap if missing | |

**User's choice:** Git pull plugin directory
**Notes:** None

---

## Idempotency Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Report status and skip | Print "already installed (vX.Y.Z)" and skip | ✓ |
| Skip silently | No output for already-installed components | |
| Run full doctor after | Run /tb:doctor at the end for health verification | |

**User's choice:** Report status and skip
**Notes:** Gives confidence everything is in place

### Follow-up: Patch re-application

| Option | Description | Selected |
|--------|-------------|----------|
| Always re-apply | Run apply-all.sh every time (patches are idempotent) | ✓ |
| Check first, skip if verified | Run verify-patches.sh first, conditionally apply | |

**User's choice:** Always re-apply
**Notes:** Patches already check for markers and skip if present

---

## Claude's Discretion

- Exact SKILL.md step ordering and bash commands for bootstrap
- Error messages and recovery guidance
- Claude settings parsing for forgetful-plugin discovery
- Order of operations in /tb:update

## Deferred Ideas

None — discussion stayed within phase scope
