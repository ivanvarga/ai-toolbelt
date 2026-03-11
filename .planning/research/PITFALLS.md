# Pitfalls Research

**Domain:** Claude Code plugin + developer toolkit + mobile automation (mbridge)
**Researched:** 2026-03-11
**Confidence:** HIGH (grounded in official Claude Code plugin docs, real mobilecli GAPS.md from production use, and established mobile automation patterns)

## Critical Pitfalls

### Pitfall 1: Plugin Directory Layout — Nesting Components Inside .claude-plugin/

**What goes wrong:**
Commands, skills, agents, and hooks directories get placed inside the `.claude-plugin/` folder instead of at the plugin root. Claude Code silently ignores them — no error, just missing functionality.

**Why it happens:**
Intuitive mental model says "everything plugin-related goes in the plugin folder." The official docs explicitly warn against this but it remains the single most common structural mistake.

**How to avoid:**
Only `plugin.json` goes inside `.claude-plugin/`. All component directories (`commands/`, `skills/`, `agents/`, `hooks/`) must be direct children of the plugin root:
```
ai-toolbelt/           <-- plugin root
  .claude-plugin/
    plugin.json        <-- ONLY this goes here
  commands/            <-- at root, NOT inside .claude-plugin/
  skills/
  hooks/
```

**Warning signs:**
Skills not appearing in `/help`, commands not resolving with `/ai-toolbelt:command-name`, hooks not firing. If installed via `--plugin-dir` and nothing works, check directory layout first.

**Phase to address:**
Phase 1 (Plugin Packaging) — establish correct directory structure from the very first commit. Validate with `claude --plugin-dir ./` before anything else.

---

### Pitfall 2: Plugin Cache Staleness After Updates

**What goes wrong:**
After updating a plugin (new version, new commit), Claude Code sessions continue using old cached versions. `CLAUDE_PLUGIN_ROOT` environment variable resolves to stale cache directories. Different sessions may run different plugin versions simultaneously.

**Why it happens:**
Plugins installed from marketplaces are pinned to a specific commit SHA. Claude Code caches plugin versions in `~/.claude/plugins/cache/` and does not reliably invalidate old versions. This is a known bug (GitHub issue #15642) that was closed without fix.

**How to avoid:**
- During development: always use `--plugin-dir` (loads directly, bypasses cache entirely)
- For production use: document that users should run `/reload-plugins` after `git pull`
- If issues persist: delete old cache entries manually from `~/.claude/plugins/cache/`
- Consider building a self-update command into the plugin that clears its own cache

**Warning signs:**
Changes to skills/commands not taking effect despite confirmed git pull. Version mismatch in logs. Scripts referencing old paths.

**Phase to address:**
Phase 1 (Plugin Packaging) — design the install/update mechanism knowing this cache bug exists. Build a `/ai-toolbelt:update` command that handles cache clearing.

---

### Pitfall 3: Skill $HOME Path Assumptions Breaking on Plugin Install

**What goes wrong:**
Existing skills reference `$HOME/.claude/skills/skill-name/` for helper scripts, config files, and credential lookups. When migrated into a plugin, the path becomes `$CLAUDE_PLUGIN_ROOT/skills/skill-name/` (or wherever the plugin is cached). Every hardcoded `$HOME/.claude/` reference breaks silently.

**Why it happens:**
Skills were originally standalone files in `~/.claude/skills/`. They work fine there. During migration to plugin form, path references are easy to miss because they are scattered across SKILL.md instructions, shell scripts, and inline bash commands that Claude generates based on skill instructions.

**How to avoid:**
- Replace all `$HOME/.claude/skills/` with `$SKILL_DIR/` or `$CLAUDE_PLUGIN_ROOT/skills/` in helper scripts
- In SKILL.md files, use relative references: `$(dirname "$0")` or the `$SKILL_DIR` variable that Claude Code exposes
- Audit every skill for path references before migration: `grep -r '$HOME/.claude' skills/`
- Test each migrated skill via `--plugin-dir` before considering it done

**Warning signs:**
"File not found" errors when running skill helper scripts. Skills that worked standalone but fail as plugin components. Credential setup scripts writing to wrong keychain service paths.

**Phase to address:**
Phase 2 (Skill Migration) — systematic audit of every skill. Create a migration checklist that includes path verification.

---

### Pitfall 4: UIAutomator Idle-State Failure on Dynamic Screens

**What goes wrong:**
Android UIAutomator requires the UI to be in an "idle" state before it can dump the accessibility tree. Screens with running timers, animations, live counters, or auto-refreshing content never reach idle. `dump ui` returns 0 elements — not an error, just empty data. All downstream helpers (find_el, tap_text, assert_screen) silently fail or report "element not found" when the real problem is the dump itself.

**Why it happens:**
UIAutomator was designed for static UI testing. It waits for all accessibility events to settle before capturing state. Continuously updating UI elements generate an infinite stream of events. This is a fundamental limitation of the Android accessibility framework, not a mobilecli bug.

**How to avoid:**
- mbridge must detect empty/failed dumps and fall back automatically (not after 3 retries — detect immediately based on element count)
- Implement OCR-based verification as a fallback path (the whole point of mbridge's OCR approach)
- Navigate away from animated screens to perform UI dumps, then navigate back
- For screens that must be tested with animations, use coordinate-based interaction from previously known positions

**Warning signs:**
`dump_ui` returning 0 elements or empty JSON. Retries wasting time on screens that will never become idle. Test scripts timing out on specific screens that have animations.

**Phase to address:**
Phase 5/6 (mbridge Rebuild) — design the dump-then-fallback-to-OCR pattern as a core architectural decision, not an afterthought.

---

### Pitfall 5: React Native Modals Unreachable via Coordinate Taps

**What goes wrong:**
React Native Modal and Alert dialogs render in a separate native window/layer. Coordinate-based taps (`adb shell input tap` or `mobilecli io tap`) pass through or miss entirely. The dialog is visible in screenshots but untouchable via automation. BACK button also fails to dismiss them. Automation gets permanently stuck.

**Why it happens:**
ADB's `input tap` dispatches touch events to the foreground activity's main window. React Native modals may render in an overlay window that doesn't receive these events. This is documented as an open issue in the existing mobilecli GAPS.md (gap #10).

**How to avoid:**
- Investigate `adb shell input keyevent` (DPAD navigation + ENTER) as an alternative input method for dialogs
- Investigate accessibility-based tap targeting instead of coordinate-based
- Design mbridge with multiple input dispatch strategies, not just coordinate taps
- For testing: avoid triggering modal dialogs when possible, or test modal flows manually

**Warning signs:**
Taps on dialog buttons having no effect. Tests hanging after a modal appears. Screenshots showing a dialog but dump_ui not including its elements.

**Phase to address:**
Phase 5/6 (mbridge Rebuild) — plan for multiple input dispatch strategies from the start.

---

### Pitfall 6: Credential Setup Scripts Requiring Manual Intervention

**What goes wrong:**
Credential setup scripts that rely on browser automation (AppleScript to extract cookies from Chrome, etc.) fail when: Chrome isn't the default browser, browser security updates change cookie storage, macOS permissions haven't been granted (Accessibility, Automation), or the user hasn't logged into the service. The "automated" setup requires a chain of manual prerequisites that aren't documented.

**Why it happens:**
The gh-upload skill's setup.sh extracts `user_session` cookies from Chrome via AppleScript. This works on the author's machine but breaks on fresh setups. Each skill's credential requirements are different and undocumented. Users don't know what prerequisites exist until something fails.

**How to avoid:**
- Document ALL prerequisites for each skill's credential setup
- Implement graceful degradation: if automated extraction fails, prompt for manual entry with clear instructions
- Create a unified credential health-check command that validates all keychain entries exist and reports which skills are ready vs. need setup
- Never assume Chrome is installed or is the default browser

**Warning signs:**
Setup scripts failing silently or with cryptic AppleScript errors. New machine setup taking hours of debugging. Skills working on one machine but not another.

**Phase to address:**
Phase 3 (Credential Management) — build the unified credential system with explicit prerequisite checking and manual fallbacks.

---

### Pitfall 7: Skill Namespace Collisions After Plugin Migration

**What goes wrong:**
If the user still has standalone skills in `~/.claude/skills/` AND the plugin provides the same skills, both versions load. Claude may use either version unpredictably. The standalone version uses `$HOME/.claude/skills/` paths; the plugin version uses `$CLAUDE_PLUGIN_ROOT/skills/` paths. Behavior becomes inconsistent.

**Why it happens:**
Migration is incremental — users install the plugin before removing standalone skills. Claude Code doesn't warn about duplicate skill names across standalone and plugin sources.

**How to avoid:**
- Plugin install script should detect and warn about conflicting standalone skills
- Name plugin skills differently during transition period (unlikely to be worth it for a personal toolkit)
- Better: create a migration command that moves standalone skills to a backup and installs the plugin atomically
- Document that standalone skills in `~/.claude/` must be removed after plugin install

**Warning signs:**
Skills behaving differently across sessions. Path-related errors appearing intermittently. "It works sometimes" debugging pattern.

**Phase to address:**
Phase 7 (Install/Update Flow) — the install command must handle cleanup of standalone skills.

---

### Pitfall 8: mbridge Python Environment Fragility on macOS

**What goes wrong:**
macOS ships a system Python (`/usr/bin/python3`) that is incomplete and should not be used for development. Users may have Homebrew Python, pyenv Python, conda Python, or Python.org Python — all in different paths with different site-packages. mbridge's Python dependencies (OCR libraries, device interaction libraries) install into whichever Python `pip` resolves to, which may not be the same Python that `python3` resolves to.

**Why it happens:**
macOS Python ecosystem is fragmented. PATH ordering determines which Python runs. `pip install` and `python3` may resolve to different installations. Virtual environments solve this but add setup complexity.

**How to avoid:**
- Ship mbridge with its own virtual environment created during install (`python3 -m venv`)
- Pin the venv creation to a minimum Python version (3.10+)
- Use `#!/usr/bin/env python3` shebangs, never hardcoded paths
- Install script should create and activate the venv, install dependencies into it, and create a wrapper script that activates the venv before running mbridge
- Test install on a clean macOS (no Homebrew Python) to verify it works with system Python

**Warning signs:**
`ModuleNotFoundError` after pip install claims success. Different behavior between terminal sessions. "Works in my shell but not in Claude Code's bash" issues.

**Phase to address:**
Phase 5/6 (mbridge Rebuild) — virtual environment setup must be part of the install process, not optional.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline bash in SKILL.md instead of helper scripts | Faster to write, no extra files | Unmaintainable when logic grows, can't test independently, Claude regenerates slightly different versions each time | Never for anything beyond 3 lines |
| Hardcoded device IDs in test scripts | Quick testing on known device | Scripts break on different machines/devices | Never — always use env vars or device selection |
| Using `sleep` instead of polling | Simple to write | Flaky tests, wasted time on fast machines, timeouts on slow machines | Never — always poll with timeout |
| Skipping venv for Python tools | Faster initial setup | Dependency conflicts with system packages, breaks on Python upgrades | Only in earliest prototyping, never in shipped install |
| Copy-pasting skill instructions instead of referencing shared docs | Each skill is self-contained | Instruction drift between skills, inconsistent behavior, multiplied maintenance | Only for truly independent skills |
| Storing secrets in env vars instead of Keychain | Works everywhere, simple | Secrets in shell history, .env files accidentally committed, visible in process list | Never for this project (Keychain is a hard requirement) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| macOS Keychain (`security` CLI) | Using `security find-generic-password -w` without checking if the entry exists first — returns error text, not empty string | Always check return code: `security find-generic-password -s "service" -a "account" -w 2>/dev/null` with `$?` check |
| GitHub API (gh-upload) | Assuming `user_session` cookie is permanent | Cookie expires ~2 weeks or on logout. Build re-auth into the workflow, not just setup |
| Jira API (acli) | Hardcoding Jira instance URL | Use Keychain or config file. Instance URLs change during migrations |
| ADB (Android Debug Bridge) | Assuming single device connected | Always pass `--device` flag. Multiple emulators/devices common in development |
| xcrun simctl (iOS Simulator) | Using device UDID that changes across Xcode versions | Use device name + runtime to look up UDID dynamically |
| mobilecli | Inventing commands not in the SKILL.md reference | Only use documented commands — Claude hallucinates mobilecli subcommands that don't exist |
| Claude Code hooks | Putting hooks.json inside `.claude-plugin/` instead of `hooks/` directory | hooks.json goes in `plugin-root/hooks/hooks.json` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Spawning subagents for simple element lookups | 10-30 second latency per UI interaction | Use bash + jq one-liners, batch operations | Immediately — every subagent spawn adds ~10s |
| Taking screenshots for screen verification | 2-5 second latency per check, context window bloat from images | Use `assert_screen` / `on_screen` with text matching | Immediately — text matching is sub-second |
| Full UI dump on every operation | Redundant ADB/xcrun calls, each taking 1-3 seconds | Cache dumps, use `dump_if_stale`, batch operations | At 5+ operations per screen — latency adds up |
| Loading all skill content at plugin scan time | Plugin activation adds seconds to Claude startup | Keep SKILL.md metadata (frontmatter) minimal, use progressive disclosure | When plugin has 15+ skills |
| OCR on every screen verification | Tesseract/OCR processing adds 1-3 seconds per frame | Use OCR only as fallback when UI dump fails, cache OCR results for unchanged screens | Immediately on every call, acceptable as fallback only |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys/tokens in SKILL.md or scripts | Credentials committed to git, even in private repos | All secrets via macOS Keychain. Scripts read from Keychain at runtime. Never inline |
| Session cookies in environment variables | Visible in `ps` output, shell history, may leak to subprocesses | Read from Keychain per-invocation. Never export to env |
| Plugin settings.json containing credentials | Credentials installed on every machine that installs the plugin | settings.json for configuration only. Credentials always in Keychain, populated by setup scripts |
| Not scoping Keychain entries with unique service names | Different tools overwriting each other's credentials | Use unique service names: `ai-toolbelt-gh-upload`, `ai-toolbelt-jira`, etc. Prefix with plugin name |
| setup.sh scripts that `echo` secrets to stdout | Secrets appear in Claude's conversation context, logs | Setup scripts should `security add-generic-password` silently. Only output success/failure messages |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent failures when credentials are missing | Skill runs, produces wrong results or cryptic errors, user doesn't know why | Check credentials at skill activation, fail fast with "Run `ai-toolbelt:setup` to configure X" |
| No feedback during long operations (OCR, device interaction) | User thinks Claude is stuck | Print progress messages: "Dumping UI tree...", "Running OCR on screenshot..." |
| Skills that work differently across platforms (iOS vs Android) | Confusion when switching devices | Document platform-specific behavior in SKILL.md. Detect platform and adjust automatically |
| Update mechanism that requires manual git commands | User falls behind on updates, skills break | Build `/ai-toolbelt:update` command that handles git pull + cache invalidation + dependency updates |
| Credential setup requiring 5 different manual steps | Users abandon setup midway | Single `ai-toolbelt:setup` command that walks through everything with progress tracking |

## "Looks Done But Isn't" Checklist

- [ ] **Skill migration:** Skill works via `--plugin-dir` -- verify it works when installed via marketplace/git too (cache paths differ)
- [ ] **Credential setup:** setup.sh succeeds -- verify the credential actually works by making a test API call, not just storing a value
- [ ] **mbridge install:** `pip install` succeeds -- verify the installed binary is in PATH and resolves to the correct venv Python
- [ ] **Plugin update:** `/reload-plugins` picks up changes -- verify this works across new Claude Code sessions, not just within the current one
- [ ] **Cross-platform mobile automation:** Works on iOS simulator -- verify it works on Android emulator AND real devices (all three are different code paths)
- [ ] **Helper script permissions:** Script runs locally -- verify it runs within Claude Code's sandboxed Bash environment (permission model is different)
- [ ] **Deeplink navigation:** Deeplink opens correct screen -- verify it works on cold start, not just when app is already running
- [ ] **OCR verification:** OCR reads clean text -- verify it works with the actual app's font, colors, and density scale

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong plugin directory layout | LOW | Move directories to root, test with `--plugin-dir`, takes 5 minutes |
| Stale plugin cache | LOW | Delete `~/.claude/plugins/cache/ai-toolbelt/`, reinstall |
| Hardcoded paths in migrated skills | MEDIUM | grep for `$HOME/.claude`, replace with `$SKILL_DIR` or `$CLAUDE_PLUGIN_ROOT`, re-test each skill |
| Python environment broken | MEDIUM | Delete venv, recreate with explicit Python path, reinstall dependencies |
| Credential namespace collision | LOW | Rename Keychain service names with prefix, update all referencing scripts |
| UIAutomator failures on dynamic screens | HIGH | Requires architectural change to add OCR fallback path — cannot be patched incrementally |
| RN modal unreachable | HIGH | Requires alternative input dispatch strategy — no quick fix exists |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Plugin directory layout | Phase 1 (Plugin Packaging) | `claude --plugin-dir ./` loads all skills, `/help` shows them |
| Plugin cache staleness | Phase 1 (Plugin Packaging) | Install via marketplace, update, verify new version loads |
| $HOME path assumptions | Phase 2 (Skill Migration) | `grep -r '\$HOME/.claude' skills/` returns 0 results |
| UIAutomator idle-state failures | Phase 5/6 (mbridge) | Run mbridge against a screen with a running timer, verify fallback triggers |
| RN modal interaction | Phase 5/6 (mbridge) | Trigger a React Native Alert, verify mbridge can dismiss it |
| Credential setup fragility | Phase 3 (Credential Management) | Run setup on fresh macOS with no Chrome, verify graceful fallback |
| Skill namespace collisions | Phase 7 (Install/Update) | Install plugin while standalone skills exist, verify only plugin versions are used |
| Python environment fragility | Phase 5/6 (mbridge) | Run install on clean macOS (system Python only), verify mbridge works |

## Sources

- [Claude Code Plugins - Create plugins](https://code.claude.com/docs/en/plugins) -- official plugin structure, common mistakes warning
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- complete plugin spec
- [Plugin cache stale version bug (GitHub #15642)](https://github.com/anthropics/claude-code/issues/15642) -- CLAUDE_PLUGIN_ROOT resolving to old versions
- [Plugin update detection issue (GitHub #31462)](https://github.com/anthropics/claude-code/issues/31462) -- no built-in update mechanism
- [Keeping Claude Code plugins up to date](https://workingbruno.com/notes/keeping-claude-code-plugins-date) -- manual update workarounds
- [Appium Common Pitfalls 2025](https://medium.com/@abhishek.builds/mobile-automation-with-appium-common-pitfalls-and-how-to-fix-them-2025-guide-aa352228c49a) -- mobile automation flakiness patterns
- [React Native Accessibility](https://reactnative.dev/docs/accessibility) -- RN accessibility tree for automation
- [Tesseract OCR limitations](https://www.koncile.ai/en/ressources/is-tesseract-still-the-best-open-source-ocr) -- OCR accuracy and alternatives
- [Python on macOS docs](https://docs.python.org/3/using/mac.html) -- system Python limitations, PATH issues
- [Portable shell scripts guide](https://www.huuphan.com/2024/11/how-to-write-portable-shell-scripts.html) -- avoiding hardcoded paths
- mobilecli GAPS.md (local: `~/.claude/skills/mobilecli/GAPS.md`) -- real production issues from actual usage
- mobilecli SKILL.md (local: `~/.claude/skills/mobilecli/SKILL.md`) -- known limitations section, common mistakes

---
*Pitfalls research for: Claude Code plugin + developer toolkit + mobile automation (mbridge)*
*Researched: 2026-03-11*
