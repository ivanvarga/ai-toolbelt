# Roadmap: ai-toolbelt

## Overview

ai-toolbelt delivers a private Claude Code plugin that consolidates all custom commands and skills (converted to the unified skills format), credential management, and a new Python-based mobile automation CLI (mbridge) into a single installable repo. All 16 existing items (9 former commands + 7 existing skills) are converted to SKILL.md + frontmatter format, organized by complexity. The roadmap moves from plugin foundation through skill conversion, credential setup, verification, and finally builds mbridge as a standalone capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Plugin Scaffold** - Establish plugin manifest, marketplace config, and directory structure (completed 2015-03-11)
- [x] **Phase 2: Plugin Install + Operations** - Install script, update mechanism, health check, and session hook (completed 2015-03-11)
- [ ] **Phase 3: Simple Skill Conversion** - Convert 8 pure-markdown items to skill format in plugin
- [x] **Phase 4: Complex Skill Conversion** - Convert 8 items with helper scripts and external tool dependencies to skill format (completed 2015-03-12)
- [ ] **Phase 5: Credential System** - Keychain-based credential setup for all skills needing secrets
- [ ] **Phase 6: Global Config + Verification** - Distribute global CLAUDE.md and verify all 18 converted skills
- [ ] **Phase 7: mbridge CLI Foundation** - Python CLI skeleton with device discovery
- [ ] **Phase 8: mbridge UI Parsing** - UI dump parsing and element finding for iOS and Android
- [ ] **Phase 9: mbridge Interaction + OCR** - Device interaction commands and OCR-based verification
- [x] **Phase 10: mbridge Skill Integration** - SKILL.md that connects mbridge to app code knowledge and mobilecli context (completed 2015-03-14)
- [x] **Phase 11: mbridge Deploy + Setup Hardening** - Reinstall stale binary, harden setup.js version detection, fix doctor output (completed 2015-03-14)
- [x] **Phase 12: Purge mobilecli References** - Replace all dead mobilecli references with mbridge equivalents, remove dead code (completed 2015-03-14)
- [x] **Phase 13: Create attachment-documenter Agent** - Create agent definition for attachment-documenter referenced by 4 skills (gap closure) (completed 2015-03-14)

## Phase Details

### Phase 1: Plugin Scaffold
**Goal**: The repo is a valid Claude Code plugin with correct directory layout for skills and tools
**Depends on**: Nothing (first phase)
**Requirements**: PLUG-01
**Success Criteria** (what must be TRUE):
  1. `.claude-plugin/plugin.json` exists with valid manifest and the plugin loads in Claude Code without errors
  2. `marketplace.json` exists for private distribution and points to the correct git repo
  3. Directory structure has `skills/` and `tools/` directories ready for content
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Plugin manifest, marketplace config, directory structure, CLAUDE.md, and .gitignore

### Phase 2: Plugin Install + Operations
**Goal**: Users can install the plugin on a fresh machine and keep it updated, with health checking and automatic context injection
**Depends on**: Phase 1
**Requirements**: PLUG-02, PLUG-03, PLUG-04, PLUG-05
**Success Criteria** (what must be TRUE):
  1. Running the install script on a fresh machine clones the repo and registers the plugin in Claude Code
  2. Running the update command pulls the latest changes and the plugin reflects them
  3. Running the doctor/health-check command reports the status of all plugin components (skills, credentials)
  4. Starting a new Claude Code session automatically injects toolkit context via the SessionStart hook
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — SessionStart hook with dynamic skill discovery + README install docs
- [x] 02-02-PLAN.md — /tb:update and /tb:doctor skills with modular check scripts

### Phase 3: Simple Skill Conversion
**Goal**: All 8 simple items (pure markdown, no helper scripts or credentials) are converted to SKILL.md + frontmatter format and work from the plugin
**Depends on**: Phase 1
**Requirements**: MIGR-01
**Success Criteria** (what must be TRUE):
  1. All 8 simple items (catchup, github-issue, github-pr, qa-description, ship-ticket, create-release-branch, daily-summary, reset-app-data) exist as SKILL.md files with proper frontmatter in the plugin skills/ directory
  2. Each converted skill is invocable from Claude Code and produces the same behavior as the original command or skill
  3. Original items in ~/.claude/commands/ and ~/.claude/skills/ can be removed for these 8 without loss of functionality
  4. Each SKILL.md has correct frontmatter fields (name, description, trigger patterns) per Claude Code skills spec
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Convert pr-read, pr-qa, pr-submit, task-github to SKILL.md format
- [ ] 03-02-PLAN.md — Convert catchup, release-create, track-summary, mobile-reset to SKILL.md format

### Phase 4: Complex Skill Conversion
**Goal**: All 8 complex items (helper scripts, external tool dependencies, credential needs) are converted to SKILL.md + frontmatter format with supporting files
**Depends on**: Phase 1, Phase 3 (validates conversion pattern)
**Requirements**: MIGR-02, MIGR-03, MIGR-04
**Success Criteria** (what must be TRUE):
  1. All 8 complex items (gh-upload, mobilecli, contentful-cli, create-figma-component, jira, investigate-sentry-issue, pr-description, upload-sentry-sourcemaps) exist as SKILL.md files with proper frontmatter and supporting files in the plugin skills/ directory
  2. Every `$HOME/.claude/` path reference in SKILL.md files and helper scripts is rewritten to use plugin-relative paths
  3. Inline bash/logic in complex skills is converted to Node.js helper scripts stored as supporting files alongside each SKILL.md
  4. Each skill loads correctly when Claude Code reads the plugin and supporting files are accessible
**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md — Shared infrastructure: scripts/keychain.js, scripts/sentry-api.js, scripts/github-api.js
- [x] 04-02-PLAN.md — Convert pr-upload, sentry-investigate, sentry-sourcemaps (consume shared infra)
- [ ] 04-03-PLAN.md — Convert task-jira, pr-describe, contentful, figma-component
- [ ] 04-04-PLAN.md — Convert mobilecli (solo plan, largest skill with test-helpers.sh)

### Phase 5: Credential System
**Goal**: Every skill that needs secrets has a keychain-based setup script following a consistent pattern, with shared base module, API verification, doctor integration, and auto-detect in SKILL.md
**Depends on**: Phase 4
**Requirements**: CRED-01, CRED-02, CRED-03, CRED-04, CRED-05
**Success Criteria** (what must be TRUE):
  1. Each credential-dependent skill (Jira/acli, Sentry, Contentful, GitHub upload) has a setup.js that stores secrets in macOS Keychain via a shared base module
  2. Running a skill's setup.js prompts for credentials, verifies via API call (where applicable), stores in Keychain, and confirms retrieval
  3. All setup scripts follow the shared base pattern with no duplicated logic
  4. Skills can retrieve their credentials from Keychain at runtime without user intervention
  5. /tb:doctor reports credential status via drop-in check scripts
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Shared setup-credential.js base module + refactor 4 setup.js wrappers
- [ ] 05-02-PLAN.md — 4 doctor credential check scripts (cred-github, cred-sentry, cred-contentful, cred-acli)
- [ ] 05-03-PLAN.md — setup-all orchestrator + SKILL.md Prerequisites standardization

### Phase 6: Global Config + Verification
**Goal**: Global CLAUDE.md is distributed via the plugin and all 18 skills pass /skill-creator verification and benchmarking
**Depends on**: Phase 4, Phase 5
**Requirements**: CONF-01, MIGR-05
**Success Criteria** (what must be TRUE):
  1. The global CLAUDE.md is included in the plugin and distributed to ~/.claude/ via /tb:update
  2. Each of the 18 skills (16 converted + doctor + update) passes /skill-creator verification and benchmarking
  3. /tb:doctor verifies global config sync status
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Global config distribution: config/CLAUDE.md, update skill copy step, doctor check, README
- [ ] 06-02-PLAN.md — Verify all 18 skills via /skill-creator, fix flagged issues

### Phase 7: mbridge CLI Foundation
**Goal**: mbridge is an installable Python CLI that can discover connected iOS simulators and Android emulators
**Depends on**: Phase 1 (lives in tools/mbridge/)
**Requirements**: MBRD-01, MBRD-02
**Success Criteria** (what must be TRUE):
  1. Running `uv tool install` from tools/mbridge/ installs the mbridge CLI globally
  2. Running `mbridge devices` lists connected iOS simulators (via xcrun simctl) and Android emulators (via adb)
  3. The CLI uses Click for command structure and provides help text for all commands
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — Python package with Click CLI skeleton, all command groups, setup.js for uv auto-install
- [ ] 07-02-PLAN.md — Platform modules (ios.py, android.py), coordinate conversion, device/app command implementations
- [ ] 07-03-PLAN.md — Gap closure: wire orphaned coords.py into ios.py, expand with docstrings

### Phase 8: mbridge UI Parsing
**Goal**: mbridge can capture and parse UI hierarchy from iOS and Android devices and find elements within it
**Depends on**: Phase 7
**Requirements**: MBRD-03, MBRD-05
**Success Criteria** (what must be TRUE):
  1. Running `mbridge dump` on an iOS simulator produces a parsed JSON UI hierarchy
  2. Running `mbridge dump` on an Android emulator produces a parsed XML UI hierarchy
  3. Elements can be found by accessibility ID, text content, or XPath expression
  4. Element results include position coordinates sufficient for interaction
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Parsing infrastructure: normalize.py, ios_parser.py, android_parser.py with test fixtures and unit tests
- [ ] 08-02-PLAN.md — Query engine (query.py) and CLI wiring (ui dump + ui find subcommands)

### Phase 9: mbridge Interaction + OCR
**Goal**: mbridge can interact with device UIs via tap/swipe/text and verify results using OCR
**Depends on**: Phase 8
**Requirements**: MBRD-04, MBRD-06
**Success Criteria** (what must be TRUE):
  1. Running `mbridge tap` on coordinates or a found element performs a tap on the device
  2. Running `mbridge swipe` performs a swipe gesture with configurable direction and distance
  3. Running `mbridge type` inputs text into the currently focused field
  4. Running `mbridge verify` uses pytesseract OCR to confirm expected text is visible on screen
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Platform interaction functions (tap/swipe/type) + action subcommands with element targeting
- [ ] 09-02-PLAN.md — Screenshot functions, OCR module, and verify text subcommand

### Phase 10: mbridge Skill Integration
**Goal**: mbridge is usable as a Claude Code skill with full command reference, app context bootstrapping, and doctor integration, replacing mobilecli entirely
**Depends on**: Phase 9, Phase 4 (mobilecli skill must be converted)
**Requirements**: MBRD-07
**Success Criteria** (what must be TRUE):
  1. A SKILL.md for mbridge exists in the plugin skills/ directory with instructions for Claude Code
  2. The skill references mobilecli's context/cache system for app-specific knowledge (screen names, navigation patterns)
  3. Claude Code can use the mbridge skill to automate a basic multi-step mobile interaction (navigate, tap, verify)
**Plans**: 1 plan

Plans:
- [ ] 10-01-PLAN.md — mbridge SKILL.md (~500 lines), doctor check script, delete mobilecli

### Phase 11: mbridge Deploy + Setup Hardening
**Goal**: mbridge installed binary is current with source, setup.js detects staleness, and doctor output follows conventions
**Depends on**: Phase 10
**Requirements**: MBRD-03, MBRD-04, MBRD-05, MBRD-06
**Gap Closure**: Closes INT-01, FLOW-01 from audit
**Success Criteria** (what must be TRUE):
  1. Running `mbridge ui dump` on a connected device succeeds (binary includes Phase 8-10 code)
  2. setup.js detects when the installed binary version differs from source and triggers reinstall
  3. tool-mbridge.sh doctor check emits exactly 1 output line per convention
**Plans**: 1 plan

Plans:
- [ ] 11-01-PLAN.md — Reinstall binary, harden setup.js version detection, fix doctor output

### Phase 12: Purge mobilecli References
**Goal**: All references to the deleted mobilecli CLI are replaced with mbridge equivalents, dead code removed
**Depends on**: Phase 11
**Requirements**: MBRD-07
**Gap Closure**: Closes INT-02, FLOW-02 from audit
**Success Criteria** (what must be TRUE):
  1. pr-describe SKILL.md uses mbridge commands instead of mobilecli for device screenshots
  2. pr-upload SKILL.md uses mbridge commands instead of mobilecli for screenshots
  3. pr-qa SKILL.md references `.mbridge/deeplinks.md` instead of `.mobilecli/deeplinks.md`
  4. No remaining references to `mobilecli` in any SKILL.md file
  5. coords.py has no unused exports (logical_to_physical, physical_to_logical removed or wired)
**Plans**: 1 plan

Plans:
- [ ] 12-01-PLAN.md — Replace mobilecli references in pr-describe, pr-upload, pr-qa; remove dead coords.py exports

### Phase 13: Create attachment-documenter Agent
**Goal**: The attachment-documenter agent definition and orchestrating skill exist in the plugin so consumer skills can invoke it via the Agent tool at runtime
**Depends on**: Phase 4
**Requirements**: MIGR-02
**Gap Closure**: Closes INT-03 from audit
**Success Criteria** (what must be TRUE):
  1. `agents/attachment-documenter.md` contains a valid agent definition with keychain-based auth
  2. `skills/attachment-documenter/SKILL.md` acts as a catch-all orchestrating skill for attachment contexts
  3. All 4 consumer skills (task-jira, sentry-investigate, task-github, pr-read) use named `subagent_type: "attachment-documenter"` via Agent tool
  4. No `.gitkeep`-only state in `agents/` directory
  5. Original files at `~/.claude/agents/` and `~/.claude/skills/attachment-documenter/` are removed
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md — Agent definition, orchestrating skill, consumer skill updates, cleanup

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plugin Scaffold | 1/1 | Complete | 2015-03-11 |
| 2. Plugin Install + Operations | 2/2 | Complete | 2015-03-11 |
| 3. Simple Skill Conversion | 0/2 | Not started | - |
| 4. Complex Skill Conversion | 4/4 | Complete | 2015-03-12 |
| 5. Credential System | 0/3 | Not started | - |
| 6. Global Config + Verification | 0/2 | Not started | - |
| 7. mbridge CLI Foundation | 2/3 | Gap closure | - |
| 8. mbridge UI Parsing | 1/2 | In Progress | - |
| 9. mbridge Interaction + OCR | 1/2 | In Progress | - |
| 10. mbridge Skill Integration | 1/1 | Complete | 2015-03-14 |
| 11. mbridge Deploy + Setup Hardening | 1/1 | Complete   | 2015-03-14 |
| 12. Purge mobilecli References | 1/1 | Complete    | 2015-03-14 |
| 13. Create attachment-documenter Agent | 1/1 | Complete    | 2015-03-14 |

### Phase 14: Per-Project Credential Scoping

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 13
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 14 to break down)

### Phase 15: Credential-Blocked Skill Testing

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 14
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 15 to break down)

### Phase 16: mbridge Testing and Hardening

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 15
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 16 to break down)
