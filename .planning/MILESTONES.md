# Milestones

## v1.1 GSD & Forgetful Integration (Shipped: 2026-04-05)

**Phases completed:** 6 phases, 9 plans, 17 tasks

**Key accomplishments:**

- MCP Streamable HTTP client module with session lifecycle, tool dispatch, SSE parsing, and CLI health check
- 4 Node.js Forgetful query scripts + 2 bash patch infrastructure scripts for GSD workflow integration
- 6 sed/awk-based patch scripts injecting Forgetful memory context into all GSD workflow decision points
- Bootstrap skill with GSD/forgetful-plugin/patches setup, update skill extended with 4 new dependency-refresh steps
- Two Forgetful interaction skills: load-context for conversational memory retrieval with importance filtering and refinement, save-findings for agent-curated phase artifact extraction with dedup and batch review
- 8 thin bin/ wrappers delegating to scripts/ via exec + dirname-relative paths for Claude Code PATH auto-discovery
- Idempotent GSD research-phase patch injecting General Discoveries section instructions with structured entry format for Forgetful curation
- Auto-curation pipeline: SubagentStop hook triggers curate-discoveries to parse, dedup, and save General Discoveries to Forgetful after every GSD research run

---

## v1.0 MVP (Shipped: 2026-03-28)

**Phases completed:** 17 phases, 36 plans, 66 tasks

**Key accomplishments:**

- Claude Code plugin scaffold with "tb" manifest, self-hosted marketplace, 5 component directories, and plugin-level CLAUDE.md
- /tb:update skill for git-based plugin updates with version diff and changelog, /tb:doctor with modular check script framework
- 4 PR-workflow and task skills (pr-read, pr-qa, pr-submit, task-github) converted to SKILL.md format with trigger-optimized descriptions and cross-skill references
- 4 standalone skills (catchup, release-create, track-summary, mobile-reset) converted to SKILL.md format, completing MIGR-01 with all 10 skills passing validation
- Three Node.js CLI scripts for Keychain access, Sentry API, and GitHub CDN upload providing shared infrastructure for Wave 2+ skills
- Three skills consuming shared infrastructure: GitHub CDN upload with session cookie setup, Sentry issue investigation with API integration, and sourcemap upload guidance with Keychain-based token passing
- Four skills: Jira ticket reading via acli with implementation planning, PR description orchestrator delegating to task-jira and pr-upload, Contentful CMS operations with safety rules and migration DSL reference using Keychain token, and Figma-to-RN component creation via MCP tool
- Largest skill converted: 510-line SKILL.md with 41-function test-helpers.sh for mobile device automation via mobilecli CLI
- Shared setup-credential.js base module with keychain/cli-check modes, replacing 4 duplicated setup.js files with thin wrappers
- 4 doctor credential check scripts (github, sentry, contentful, acli) auto-discovered by /tb:doctor with exact fix commands
- setup-all.js batch credential orchestrator plus standardized auto-detect Prerequisites across all credential-needing skills
- Global CLAUDE.md distributed via plugin with /tb:update propagation and /tb:doctor sync verification
- All 18 skills verified against skill-creator standards -- frontmatter, naming, structure, descriptions, and supporting files all valid
- Installable mbridge Python CLI with Click command groups (device, app, action, verify, ui) and uv auto-install setup.js
- Real xcrun simctl and adb wrappers for device discovery, screen info, app interaction, and point/pixel coordinate conversion
- Wired orphaned coords.py into ios.py with module docstrings, screen_logical_size helper, and logical dimension enrichment in device info
- Unified iOS/Android UI element parsing with normalized schema, type maps, visibility computation, and 57-test TDD suite
- Element query engine with id/text/xpath/type filters and dump/find CLI subcommands wired into ui Click group
- Tap, swipe, and type interaction commands with element-based targeting and platform-specific dispatch via idb/adb
- OCR-based verify text command with Tesseract integration, platform screenshot capture, and substring/exact matching
- 497-line mbridge SKILL.md with full command reference for 5 command groups, element targeting as primary interaction, doctor check for prerequisites, and mobilecli deleted
- mbridge binary deployed with --version flag, version-aware setup.js, and consolidated 1-line doctor check
- Replaced all mobilecli references with mbridge/platform-native equivalents across 5 files and removed 2 dead conversion functions from coords.py
- Ported attachment-documenter agent definition with keychain auth (tb.jira-token, tb.github-session) and updated 4 consumer skills to use named subagent_type pattern
- Git remote org extraction and org-aware credential resolution with global fallback via resolve-org.js and resolve-credential.js
- setup-credential.js auto-detects org from git remote and stores to tb.{service}.{org} Keychain keys, with --global override
- All 8 credential consumers migrated to resolve-credential.js with org-first resolution for API scripts, 4 SKILL.md files, setup.js, and attachment-documenter agent
- Org-aware doctor credential checks with 3-tier reporting (org-scoped/global-fallback/missing) and interactive migration script for global-to-org credential scoping
- 23-point static audit of all credential wiring (SKILL.md, setup.js, doctor checks, API scripts, migration) plus 39-step executable test checklist covering credential resolution, setup flows, auto-detect, doctor checks, and integration points
- End-to-end credential system validation: 61/63 tests pass across org resolution, credential lookup with fallback, setup flows, doctor checks, auto-detect wiring, and interactive re-entry -- plus bug fix for --global flag parsing
- Deleted 112 unit tests, added ui wait-for polling command with monotonic timing, created 24 subprocess-based integration tests
- Android emulator boot lifecycle with GPU host-to-software fallback, AVD discovery via --available flag, iOS Simulator.app opening, and error propagation hardening
- swipe-to command with usable zone auto-centering (extra swipe for edge elements), SKILL.md updated with Android emulator boot documentation

---
