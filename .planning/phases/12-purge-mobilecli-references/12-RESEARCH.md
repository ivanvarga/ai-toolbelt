# Phase 12: Purge mobilecli References - Research

**Researched:** 2026-03-14
**Domain:** SKILL.md content migration, dead code removal
**Confidence:** HIGH

## Summary

Phase 12 is a cleanup phase that replaces all remaining references to the deleted `mobilecli` CLI with `mbridge` equivalents and removes dead code from `coords.py`. The mobilecli skill directory was already deleted in Phase 10 when the mbridge skill was created, but several other SKILL.md files and project-level config still reference the old CLI.

This is a straightforward text-replacement and dead-code-removal task. No new features, no library changes, no architectural decisions. The key subtlety is that mbridge does NOT expose a `screenshot` CLI command -- screenshots are internal-only (used by `verify text` for OCR). The pr-describe screenshot flow must use `xcrun simctl io` / `adb` commands directly, with `mbridge device list` for device discovery.

**Primary recommendation:** Replace mobilecli references with mbridge equivalents in 3 SKILL.md files, update CLAUDE.md skill naming example, clean settings.local.json permission, and remove 2 unused functions from coords.py.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MBRD-07 | mbridge SKILL.md that leverages app code knowledge and mobilecli context/cache | This phase closes the last mobilecli debt -- other skills referencing mobilecli must point to mbridge instead, completing the migration. Closes INT-02 and FLOW-02 from audit. |
</phase_requirements>

## Exact Changes Required

### File 1: `skills/pr-describe/SKILL.md`

**Lines 49-50** currently read:
```
1. Ask which device -- run `mobilecli devices` and present options
2. Take "After" screenshot (current state): `mobilecli screenshot --device <id> -o /tmp/pr-after.png`
```

**Replace with** mbridge device list for discovery. For screenshots, mbridge has no CLI screenshot command -- use `xcrun simctl io` (iOS) or `adb exec-out screencap` (Android) directly. The mbridge device list provides device IDs and platform info needed to pick the right screenshot command:

```
1. Ask which device -- run `mbridge device list` and present options
2. Take "After" screenshot (current state):
   - iOS: `xcrun simctl io <device_id> screenshot /tmp/pr-after.png`
   - Android: `adb -s <device_id> exec-out screencap -p > /tmp/pr-after.png`
```

### File 2: `skills/pr-upload/SKILL.md`

**Lines 54-60** currently read:
```markdown
## With mobilecli screenshots

\```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
mobilecli screenshot --device <id> -o /tmp/screenshot.png
URL=$(node "$PLUGIN_ROOT/scripts/github-api.js" upload /tmp/screenshot.png)
echo "![screenshot]($URL)"
\```
```

**Replace** section header and screenshot command with mbridge device list + platform-specific screenshot:

```markdown
## With device screenshots

\```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
# iOS:
xcrun simctl io <device_id> screenshot /tmp/screenshot.png
# Android:
# adb -s <device_id> exec-out screencap -p > /tmp/screenshot.png
URL=$(node "$PLUGIN_ROOT/scripts/github-api.js" upload /tmp/screenshot.png)
echo "![screenshot]($URL)"
\```
```

### File 3: `skills/pr-qa/SKILL.md`

**Line 50** currently reads:
```
- **Deeplinks:** Check `.mobilecli/deeplinks.md` cache first.
```

**Replace with:**
```
- **Deeplinks:** Check `.mbridge/deeplinks.md` cache first.
```

### File 4: `CLAUDE.md`

**Line 11** currently reads:
```
- Standalone skills without a family prefix: `catchup`, `mobilecli`, `contentful`
```

**Replace with** (mobilecli skill no longer exists):
```
- Standalone skills without a family prefix: `catchup`, `mbridge`, `contentful`
```

### File 5: `.claude/settings.local.json`

**Line 4** contains a `find` permission with `mobilecli*` pattern. This is a development-time permission rule from early phases that searched for old skill files in `~/.claude/`. The mobilecli reference is dead. Options:
- Remove `mobilecli*` from the find pattern
- Or leave as-is (harmless, just finds nothing)

**Recommendation:** Remove `mobilecli*` from the find pattern for cleanliness. However, this entire permission line is development-era cruft -- the planner should decide if the whole line should be removed or just the mobilecli part.

### File 6: `tools/mbridge/src/mbridge/coords.py`

**Functions to remove:** `logical_to_physical` (lines 14-20) and `physical_to_logical` (lines 23-29).

**Verification:** Only `screen_logical_size` is imported anywhere:
```
tools/mbridge/src/mbridge/platforms/ios.py:7: from mbridge.coords import screen_logical_size
```

No imports of `logical_to_physical` or `physical_to_logical` exist in the entire codebase. The module docstring at the top references these functions and should be trimmed to only describe `screen_logical_size`.

## Architecture Patterns

### Pattern: Screenshot without mbridge CLI

mbridge deliberately does NOT expose a screenshot CLI command. Screenshots are internal to the OCR/verify subsystem. For skills that need screenshot files (pr-describe, pr-upload), the pattern is:

1. Use `mbridge device list` for device discovery (get device_id + platform)
2. Use platform-native commands for screenshot capture:
   - iOS: `xcrun simctl io <device_id> screenshot <path>`
   - Android: `adb -s <device_id> exec-out screencap -p > <path>`
3. This is consistent with mbridge's "Recommended Permissions" which already lists `Bash(xcrun:*)` and `Bash(adb:*)`

### Anti-Patterns to Avoid

- **Do NOT add a screenshot CLI command to mbridge** just to make pr-describe simpler. The mbridge design decision (screenshots internal-only) is deliberate.
- **Do NOT reference `mbridge screenshot`** -- this command does not exist.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screenshot CLI command | Adding `mbridge screenshot` subcommand | `xcrun simctl io` / `adb exec-out screencap` | mbridge design: screenshots are internal. Platform commands are already allowed in permissions. |

## Common Pitfalls

### Pitfall 1: Assuming mbridge has a screenshot command
**What goes wrong:** Replacing `mobilecli screenshot` with `mbridge screenshot` -- which doesn't exist.
**Why it happens:** Natural assumption that mbridge replaces mobilecli 1:1.
**How to avoid:** mbridge has no `screenshot` subcommand. Use platform-native commands with `mbridge device list` for discovery.

### Pitfall 2: Forgetting .mobilecli references in non-obvious places
**What goes wrong:** Leaving `.mobilecli/deeplinks.md` references in pr-qa while fixing the obvious ones in pr-describe.
**How to avoid:** The complete list of references has been audited (see Exact Changes above). There are exactly 5 files with mobilecli references outside `.planning/`.

### Pitfall 3: Breaking the CLAUDE.md skill naming examples
**What goes wrong:** Removing `mobilecli` from the example but not replacing it, making the list read awkwardly.
**How to avoid:** Replace with `mbridge` which is the current standalone skill that replaced mobilecli.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (mbridge Python tests) |
| Config file | tools/mbridge/pyproject.toml |
| Quick run command | `cd tools/mbridge && uv run pytest tests/test_action.py -x` |
| Full suite command | `cd tools/mbridge && uv run pytest` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MBRD-07 (mobilecli purge) | No mobilecli references in any SKILL.md | grep-based validation | `grep -rn mobilecli skills/ CLAUDE.md && exit 1 \|\| echo PASS` | Wave 0 |
| MBRD-07 (coords cleanup) | coords.py has no unused exports | unit test + import check | `cd tools/mbridge && uv run pytest tests/ -x` | Existing tests cover coords indirectly |

### Sampling Rate
- **Per task commit:** `grep -rn mobilecli skills/ CLAUDE.md` (should return nothing)
- **Per wave merge:** `cd tools/mbridge && uv run pytest` + `bash scripts/checks/skills-valid.sh .`
- **Phase gate:** All grep checks pass + pytest passes + skills-valid.sh passes

### Wave 0 Gaps
None -- this phase modifies SKILL.md content (validated by grep) and removes dead Python code (validated by existing pytest suite). No new test infrastructure needed.

## Sources

### Primary (HIGH confidence)
- Direct file inspection of all 5 affected files (exact line numbers verified)
- `grep -rn mobilecli` across entire repo (complete audit)
- mbridge CLI source code (cli.py, action.py, coords.py) confirming no screenshot command exists
- Import analysis confirming `logical_to_physical` and `physical_to_logical` are unused

## Metadata

**Confidence breakdown:**
- Change inventory: HIGH -- exhaustive grep, every reference identified with exact line numbers
- mbridge screenshot gap: HIGH -- verified by reading cli.py and all subcommand modules
- coords.py dead code: HIGH -- verified by grep for all imports across codebase

**Research date:** 2026-03-14
**Valid until:** Indefinite (cleanup phase, no external dependencies)
