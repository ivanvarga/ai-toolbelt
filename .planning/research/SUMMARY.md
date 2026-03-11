# Research Summary: ai-toolbelt

**Domain:** Claude Code private plugin + mobile automation CLI toolkit
**Researched:** 2026-03-11
**Overall confidence:** HIGH

## Executive Summary

ai-toolbelt is a private Claude Code plugin that consolidates 9 custom commands, 7+ custom skills, credential management scripts, a global CLAUDE.md, and a new Python-based mobile automation CLI (mbridge) into a single distributable repository. The architecture is clear: a standard Claude Code plugin at the repo root (`.claude-plugin/plugin.json` + marketplace for distribution), bash scripts for credential management via macOS Keychain, and a standalone Python package (`tools/mbridge/`) for mobile automation.

The Claude Code plugin system is mature and well-documented. It natively supports everything this project needs: skill/command auto-discovery, hook lifecycle events, private repo distribution via marketplace, auto-updates, and the `${CLAUDE_PLUGIN_ROOT}` path variable for self-contained packaging. The superpowers plugin (v4.2.0, by Jesse Vincent) serves as a proven reference implementation with skills, hooks, and session-start context injection -- the exact patterns ai-toolbelt needs.

The Python stack for mbridge is straightforward: uv (v0.10.x) for project management and tool installation, Click (8.1.x) for the CLI framework, pytesseract for OCR, lxml for Android XML parsing, and direct subprocess calls to `xcrun simctl` / `adb` for device interaction. No heavyweight frameworks like Appium needed. The key insight from researching the existing mobilecli skill is that mbridge does NOT need to replicate mobilecli 1:1 -- it starts with UI dump parsing and OCR verification (the differentiating capabilities), then adds device interaction commands incrementally.

The biggest risks are not technical but operational: path rewriting during skill migration (`$HOME/.claude/skills/` to `${CLAUDE_PLUGIN_ROOT}/skills/`), credential setup script fragility on fresh machines, and Python environment isolation on macOS. All three have proven mitigation patterns. The plugin cache staleness issue (GitHub #15642) is a known Claude Code bug that requires workarounds during development.

## Key Findings

**Stack:** Claude Code plugin system (native) + Bash/macOS Keychain (credentials) + Python/uv/Click (mbridge CLI) + pytesseract (OCR) + lxml (XML parsing) + subprocess (device control).

**Architecture:** Single repo = plugin root. Self-hosted marketplace of one. Skills and commands auto-discovered. mbridge lives in `tools/mbridge/` as a standalone Python package, referenced by a skill SKILL.md. Credentials never in files -- always macOS Keychain via `security` CLI.

**Critical pitfall:** Plugin files are COPIED to a cache directory on install. Any path referencing files outside the plugin root will break. Every `$HOME/.claude/` path in existing skills must be rewritten to `${CLAUDE_PLUGIN_ROOT}/`. This is the highest-risk migration task.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Plugin Scaffolding + Install** -- establish the foundation
   - Addresses: plugin manifest, marketplace.json, directory structure, install script
   - Avoids: building on a broken foundation (directory layout pitfall is #1 cause of plugin failures)

2. **Command + Simple Skill Migration** -- quick wins, validate plugin works
   - Addresses: 9 commands (pure .md copies) + simple skills without helper scripts (qa-description, ship-ticket, create-release-branch, daily-summary)
   - Avoids: path rewriting complexity (simple skills have no external file references)

3. **Complex Skill Migration + Credential System** -- the hard migration work
   - Addresses: gh-upload (setup.sh + upload.sh), mobilecli (test-helpers.sh), contentful-cli, investigate-sentry-issue, upload-sentry-sourcemaps
   - Avoids: credential setup fragility by building unified setup-all.sh with manual fallbacks

4. **Global CLAUDE.md + Hooks** -- polish and context injection
   - Addresses: CLAUDE.md distribution, SessionStart hook for toolkit awareness
   - Avoids: premature optimization of hooks before core skills are stable

5. **mbridge Core (Python CLI)** -- standalone tool, biggest scope item
   - Addresses: CLI skeleton with Click, device discovery, UI dump parsing (JSON for iOS, XML for Android), basic interaction commands (tap, swipe, text)
   - Avoids: OCR complexity in first pass, app code knowledge integration

6. **mbridge OCR + Advanced Features** -- differentiating capabilities
   - Addresses: pytesseract OCR verification, element finding by text/label, dump-then-fallback-to-OCR pattern for dynamic screens
   - Avoids: UIAutomator idle-state failures by designing OCR as a first-class fallback from day one

**Phase ordering rationale:**
- Phases 1-2 must be sequential: plugin structure before skills can live in it
- Phase 3 depends on Phase 1 (needs `${CLAUDE_PLUGIN_ROOT}` to be working) and Phase 2 (validates the pattern)
- Phase 4 is independent of Phase 3 but benefits from seeing the full skill set
- Phases 5-6 are independent of Phases 2-4 (mbridge is a new tool, not a migration) but depend on Phase 1 for plugin structure
- Phase 5 before Phase 6: OCR is a layer on top of the core CLI, not a parallel workstream

**Research flags for phases:**
- Phase 3: Likely needs deeper research -- each skill has unique credential requirements and external CLI dependencies (acli, sentry-cli, contentful CLI) that need individual validation
- Phase 5: May need research -- mobilecli's exact command interface should be audited to determine which commands mbridge must replicate vs. which it can skip
- Phase 6: Standard patterns, unlikely to need research -- pytesseract usage is well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Plugin system verified against official docs + real plugin structures on disk. Python tooling (uv, Click, pytesseract) verified via official docs and web search. |
| Features | HIGH | Based on direct audit of existing 9 commands and 7+ skills on disk. Feature dependencies mapped from real code. |
| Architecture | HIGH | Plugin directory structure verified against 3 installed plugins (skill-creator, superpowers, forgetful-plugin). Self-hosted marketplace pattern confirmed in official docs. |
| Pitfalls | HIGH | Plugin pitfalls from official docs. Mobile automation pitfalls from existing mobilecli GAPS.md (real production issues). Python environment pitfalls from known macOS ecosystem fragmentation. |

## Gaps to Address

- **Individual skill credential requirements**: Each skill that needs secrets (Jira, Sentry, Contentful, GitHub upload) has different credential types, expiry patterns, and setup prerequisites. Phase 3 research should audit each one.
- **mobilecli command parity**: Which mobilecli commands does mbridge need to replicate vs. which can be dropped? Needs phase-specific audit of mobilecli SKILL.md and actual usage patterns.
- **Plugin cache invalidation strategy**: The cache staleness bug (GitHub #15642) has no official fix. The workaround (`/reload-plugins` + manual cache clearing) should be tested during Phase 1 to confirm it actually works reliably.
- **Tesseract accuracy on mobile app UIs**: pytesseract accuracy on screenshots from iOS/Android apps (with various fonts, colors, and density scales) is unverified. Phase 6 should include an accuracy benchmark before committing to the OCR approach.
- **`${CLAUDE_SKILL_DIR}` vs `${CLAUDE_PLUGIN_ROOT}`**: Official docs mention both variables. Need to verify which is available in plugin context and when to use each. This affects every SKILL.md path reference.

## Sources

- [Claude Code Plugin Docs](https://code.claude.com/docs/en/plugins)
- [Claude Code Plugin Marketplace Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [uv Documentation](https://docs.astral.sh/uv/)
- [Click Documentation](https://click.palletsprojects.com/en/stable/)
- [pytesseract on PyPI](https://pypi.org/project/pytesseract/)
- [lxml Documentation](https://lxml.de/)
- [Superpowers plugin](https://github.com/obra/superpowers) -- reference implementation
- [macOS Keychain CLI](https://www.netmeister.org/blog/keychain-passwords.html)
- Local inspection: `~/.claude/skills/`, `~/.claude/commands/`, `~/.claude/plugins/cache/`
