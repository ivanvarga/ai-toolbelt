# Phase 11: mbridge Deploy + Setup Hardening - Research

**Researched:** 2026-03-14
**Domain:** Python CLI deployment (uv tool install), Node.js setup scripts, shell doctor checks
**Confidence:** HIGH

## Summary

Phase 11 closes two audit gaps (INT-01, FLOW-01) by addressing three concrete problems: (1) the installed mbridge binary is stale and missing Phase 8-10 code (ui dump, find, action, verify commands), (2) setup.js exits early when `mbridge --help` succeeds without checking if the installed version matches the source version, and (3) tool-mbridge.sh emits 3 output lines violating the doctor convention of exactly 1 line per check script.

All three problems are well-understood with straightforward fixes. The binary reinstall is a single `uv tool install` command. Version staleness detection requires comparing `pyproject.toml` version (source of truth) against `mbridge --version` output (which must be added via Click's `@click.version_option`). The doctor fix requires consolidating 3 checks into 1 line.

**Primary recommendation:** Add `--version` flag to mbridge CLI via `@click.version_option`, rewrite setup.js to compare installed vs source version, consolidate tool-mbridge.sh to 1 line, and force-reinstall the binary.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MBRD-03 | UI dump parsing -- iOS JSON and Android XML | Binary reinstall deploys Phase 8 code that implements ui dump/find |
| MBRD-04 | Basic interaction commands -- tap, swipe, text input | Binary reinstall deploys Phase 9 code that implements action commands |
| MBRD-05 | Element finding by accessibility ID, text, XPath | Binary reinstall deploys Phase 8 code that implements query engine |
| MBRD-06 | OCR-based UI verification via pytesseract | Binary reinstall deploys Phase 9 code that implements verify command |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| click | >=8.0 | CLI framework with `@click.version_option` | Already used by mbridge; version_option is built-in |
| uv | system | Python tool installer via `uv tool install --force` | Already used for mbridge installation |
| Node.js | system | setup.js runtime, uses child_process and fs | Already used for all setup scripts in this project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hatchling | (build) | Build backend that reads version from pyproject.toml | Already configured in pyproject.toml build-system |

## Architecture Patterns

### Version Detection Strategy

**Source of truth:** `pyproject.toml` has `version = "0.1.0"` and `__init__.py` has `__version__ = "0.1.0"`. These two must stay in sync. The `pyproject.toml` version is what `uv tool install` uses.

**Installed version discovery:** Click's `@click.version_option` decorator adds a `--version` flag to the CLI. When added to `cli.py`, running `mbridge --version` will output the version string. This is the standard approach for Click CLIs.

**Version comparison in setup.js:**
1. Read version from `pyproject.toml` via regex (Node.js has no TOML parser built-in)
2. Run `mbridge --version` to get installed version
3. Compare: if different or `--version` fails, reinstall

### Pattern: Click version_option

```python
from mbridge import __version__

@click.group()
@click.version_option(version=__version__, prog_name="mbridge")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
@click.pass_context
def cli(ctx, verbose):
    """Mobile device bridge CLI."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
```

After this change, `mbridge --version` outputs: `mbridge, version 0.1.0`

### Pattern: setup.js Version Comparison

```javascript
#!/usr/bin/env node
const { execSync } = require("child_process");
const { readFileSync } = require("fs");
const { join } = require("path");

const pyproject = readFileSync(join(__dirname, "pyproject.toml"), "utf8");
const sourceVersion = pyproject.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

let installedVersion;
try {
  const output = execSync("mbridge --version", { stdio: "pipe", encoding: "utf8" });
  installedVersion = output.match(/(\d+\.\d+\.\d+)/)?.[1];
} catch {}

if (installedVersion === sourceVersion) {
  console.log("mbridge is up to date.");
  process.exit(0);
}

// mbridge not installed or version mismatch -- reinstall
try {
  execSync("which uv", { stdio: "pipe" });
} catch {
  console.error("uv is not installed. Install via: curl -LsSf https://astral.sh/uv/install.sh | sh");
  process.exit(1);
}

execSync(`uv tool install "${__dirname}" --force`, { stdio: "inherit" });
console.log("mbridge installed successfully.");
```

### Pattern: Consolidated Doctor Check (1 line)

The doctor convention is exactly 1 output line per script: `PASS|FAIL <check-name> <message>`. The current tool-mbridge.sh emits 3 lines (CLI check, Python check, tesseract check). It must be consolidated to 1 line that checks all prerequisites.

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if mbridge --version >/dev/null 2>&1 && python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null && tesseract --version >/dev/null 2>&1; then
    echo "PASS tool-mbridge mbridge CLI, Python 3.12+, tesseract installed"
else
    MISSING=""
    mbridge --version >/dev/null 2>&1 || MISSING="mbridge"
    python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null || MISSING="${MISSING:+$MISSING, }Python 3.12+"
    tesseract --version >/dev/null 2>&1 || MISSING="${MISSING:+$MISSING, }tesseract"
    echo "FAIL tool-mbridge Missing: ${MISSING}. Run: node ${PLUGIN_ROOT}/tools/mbridge/setup.js"
fi
exit 0
```

### Anti-Patterns to Avoid
- **Bumping version for deployment:** The version should only change when functionality changes. Phase 11 is deploying existing code, not adding features. Do NOT bump version unless source code is modified.
- **Using `uv tool list` for version detection:** The output format is not structured/JSON -- parsing it is fragile. Use `mbridge --version` instead.
- **Separate doctor scripts for each prerequisite:** The convention is 1 script = 1 line. Python and tesseract are prerequisites OF mbridge, not independent components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI version flag | Manual `--version` callback | `@click.version_option` | Click handles formatting, eager parameter, exit |
| TOML parsing in Node.js | Full TOML parser dependency | Regex on pyproject.toml | Version line is simple `version = "X.Y.Z"`, no need for a parser |
| Package reinstall | Manual pip/venv management | `uv tool install --force` | uv handles venv creation, path management, everything |

## Common Pitfalls

### Pitfall 1: Version String Format Mismatch
**What goes wrong:** `mbridge --version` outputs `mbridge, version 0.1.0` but setup.js expects just `0.1.0`
**Why it happens:** Click's version_option has a specific output format
**How to avoid:** Parse with regex `(\d+\.\d+\.\d+)` to extract just the semver portion
**Warning signs:** setup.js always reinstalls even when versions match

### Pitfall 2: __init__.py and pyproject.toml Version Drift
**What goes wrong:** Version in `__init__.py` differs from `pyproject.toml`, causing confusion
**Why it happens:** Two places to maintain the same value
**How to avoid:** Both files already have `0.1.0`. If bumping, update both. setup.js reads pyproject.toml (the build system source of truth).
**Warning signs:** `mbridge --version` shows different version than pyproject.toml

### Pitfall 3: Doctor Check Loses Diagnostic Detail
**What goes wrong:** Consolidating to 1 line loses visibility into WHICH prerequisite is missing
**Why it happens:** 1 line must convey pass/fail for 3 things
**How to avoid:** On FAIL, list the missing components in the message (e.g., "Missing: tesseract")
**Warning signs:** User sees FAIL but doesn't know what's missing

### Pitfall 4: uv tool install Caches Old Build
**What goes wrong:** `uv tool install` may not detect source changes if the version hasn't changed
**Why it happens:** uv uses the version from pyproject.toml to decide if rebuild is needed
**How to avoid:** Always use `--force` flag to ensure reinstall
**Warning signs:** Binary still missing new commands after install

## Code Examples

### Adding --version to mbridge CLI (cli.py)

```python
import click

from mbridge import __version__
from mbridge.action import action
from mbridge.app import app
from mbridge.device import device
from mbridge.ui import ui
from mbridge.verify import verify_group


@click.group()
@click.version_option(version=__version__, prog_name="mbridge")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
@click.pass_context
def cli(ctx, verbose):
    """Mobile device bridge CLI."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose


cli.add_command(device)
cli.add_command(app)
cli.add_command(action)
cli.add_command(verify_group)
cli.add_command(ui)
```

### Reading pyproject.toml Version in Node.js

```javascript
const { readFileSync } = require("fs");
const { join } = require("path");

const content = readFileSync(join(__dirname, "pyproject.toml"), "utf8");
const match = content.match(/^version\s*=\s*"([^"]+)"/m);
const sourceVersion = match ? match[1] : null;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setup.js checks `mbridge --help` only | setup.js compares source vs installed version | Phase 11 | Detects stale binaries, auto-reinstalls |
| tool-mbridge.sh emits 3 lines | tool-mbridge.sh emits 1 line | Phase 11 | Follows doctor convention |
| No `--version` on mbridge CLI | `@click.version_option` added | Phase 11 | Enables version comparison in setup.js |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest >=9.0.2 |
| Config file | None (discovered via pyproject.toml dev deps) |
| Quick run command | `cd tools/mbridge && uv run pytest tests/ -x` |
| Full suite command | `cd tools/mbridge && uv run pytest tests/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MBRD-03 | ui dump on connected device succeeds | manual-only | `mbridge ui dump <DEVICE_ID>` | N/A (requires device) |
| MBRD-04 | action commands work on connected device | manual-only | `mbridge action tap <DEVICE_ID> --text "OK"` | N/A (requires device) |
| MBRD-05 | ui find works on connected device | manual-only | `mbridge ui find <DEVICE_ID> --text "OK"` | N/A (requires device) |
| MBRD-06 | verify text works on connected device | manual-only | `mbridge verify text <DEVICE_ID> "OK"` | N/A (requires device) |
| setup.js | detects version mismatch and reinstalls | smoke | `node tools/mbridge/setup.js` | N/A (smoke test) |
| doctor | emits exactly 1 line | smoke | `bash scripts/checks/tool-mbridge.sh . \| wc -l` | N/A (smoke test) |

### Sampling Rate
- **Per task commit:** `cd tools/mbridge && uv run pytest tests/ -x`
- **Per wave merge:** Full suite + smoke tests
- **Phase gate:** `mbridge --version` succeeds, `mbridge ui dump` succeeds on device, doctor check emits 1 line

### Wave 0 Gaps
None -- existing test infrastructure covers unit tests. Phase 11 requirements are deployment/integration concerns validated via smoke tests on actual device, not unit tests.

## Open Questions

1. **Should version be bumped to signal the deployment?**
   - What we know: The source code hasn't changed (Phases 8-10 already wrote the code). Only the installed binary is stale.
   - What's unclear: Whether `uv tool install --force` with same version will properly rebuild
   - Recommendation: Keep version at 0.1.0 and use `--force` flag. If `--force` doesn't rebuild with same version, bump to 0.1.1.

## Sources

### Primary (HIGH confidence)
- Project source: `tools/mbridge/setup.js` -- current setup script (lines 1-20)
- Project source: `tools/mbridge/pyproject.toml` -- version = "0.1.0", hatchling build
- Project source: `tools/mbridge/src/mbridge/__init__.py` -- __version__ = "0.1.0"
- Project source: `tools/mbridge/src/mbridge/cli.py` -- current CLI without version_option
- Project source: `scripts/checks/tool-mbridge.sh` -- current 3-line output
- Project source: `skills/doctor/SKILL.md` -- "Each script outputs a single line"
- Project audit: `.planning/v1.0-MILESTONE-AUDIT.md` -- INT-01, FLOW-01 gap definitions

### Secondary (MEDIUM confidence)
- [Click documentation](https://click.palletsprojects.com/) -- version_option decorator
- `uv tool list` output confirmed: `mbridge v0.1.0` format
- `mbridge --version` confirmed: currently unsupported (no --version flag exists)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already in use, just adding click.version_option
- Architecture: HIGH - straightforward version comparison pattern
- Pitfalls: HIGH - all based on direct inspection of current code and actual CLI output

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, no fast-moving dependencies)
