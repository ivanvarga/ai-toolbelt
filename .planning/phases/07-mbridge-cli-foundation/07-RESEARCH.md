# Phase 7: mbridge CLI Foundation - Research

**Researched:** 2026-03-12
**Domain:** Python CLI (Click + uv), iOS/Android device discovery, coordinate systems
**Confidence:** HIGH

## Summary

mbridge is a Python CLI tool using Click for nested command groups, packaged with uv for global installation. Phase 7 covers the CLI skeleton, device discovery (iOS simulators via `xcrun simctl`, Android emulators via `adb`), basic app commands, and a coordinate conversion utility module.

The core technical challenge is parsing platform-specific device outputs into a unified JSON format. iOS provides native JSON via `xcrun simctl list devices --json`, while Android's `adb devices -l` outputs plain text requiring parsing. Screen dimensions come from `xcrun simctl getenv` (iOS) and `adb shell wm size`/`wm density` (Android). The coordinate system must handle iOS point-space vs Android pixel-space from day one.

**Primary recommendation:** Use `uv init --app --package mbridge` to scaffold, Click 8.x with nested `@cli.group()` decorators for command hierarchy, `subprocess.run` for platform tool invocation, and JSON output via `click.echo(json.dumps(...))` on all commands.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Nested groups using Click: `mbridge device list`, `mbridge app launch`, `mbridge action tap` (Phase 8+)
- Device ID is a required positional argument on all device-targeting commands (no auto-select)
- Phase 7 command groups: `device` (list, boot, info), `app` (list, foreground, launch, open-url)
- Placeholder groups created but empty: `action` (Phase 8-9), `verify` (Phase 9), `ui` (Phase 8)
- JSON by default on all commands (primary consumer is the mbridge SKILL.md, not humans)
- `device list` fields: id, name, platform, type (simulator/emulator/physical), state, os_version
- `device info` adds: screen dimensions (width/height/scale), architecture, runtime/SDK version, data path
- `device list` supports `--platform ios|android` filter flag, no other filters
- Python 3.12+ required
- uv for packaging (`uv tool install`)
- uv auto-install integrated into setup.js (consistent with other skill setup patterns)
- Dependencies minimal: just Click for Phase 7
- Clean redesign from mobilecli: different command names, different output format, different philosophy
- Lazy tool checks: verify xcrun/adb availability per-command, not at startup
- App knowledge stored globally at ~/.mbridge/apps/<bundle-id>/ (deeplinks, screens, navigation)
- Include coordinate utility module from Phase 7 (logical points to physical pixels)
- device info provides screen scale factor -- wired into coord conversion from day one
- Testing strategy: integration tests only -- no unit tests with mocked subprocess output
- Manual test checklist: commands verified on 4 environments (iOS sim, iOS real, Android emu, Android real)
- Phase 7 creates empty command groups (action, verify, ui) signaling future intent

### Claude's Discretion
- Verbosity flag approach (global --verbose or per-command)
- Internal Python module layout (flat vs package structure)
- Exact coordinate conversion implementation details
- pyproject.toml configuration details
- Which fields device info exposes per platform (based on what xcrun/adb actually provide)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MBRD-01 | Python CLI with uv + Click, installable via `uv tool install` | pyproject.toml structure, Click group patterns, uv tool install from local dir documented below |
| MBRD-02 | Device discovery for iOS simulators and Android emulators | xcrun simctl JSON format, adb devices parsing, unified device model documented below |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Click | 8.x (latest 8.3.1) | CLI framework with nested command groups | De facto Python CLI standard, decorator-based, auto-generated help text |
| Python | 3.12+ | Runtime | User decision, matches modern uv defaults |
| uv | latest | Package management and tool installation | User decision, modern Python tooling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| subprocess (stdlib) | builtin | Execute xcrun/adb commands | All device interaction |
| json (stdlib) | builtin | Parse xcrun JSON, format output | All command output |
| pathlib (stdlib) | builtin | File path handling | ~/.mbridge/ directory management |
| shutil.which (stdlib) | builtin | Check xcrun/adb availability | Lazy tool checks per-command |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Click | Typer | Typer adds type-hint magic but Click is the locked decision |
| subprocess | asyncio.create_subprocess | Overkill for sequential CLI commands |
| json.dumps | rich.print_json | Adds dependency; JSON stdout is sufficient for SKILL.md consumer |

**Installation:**
```bash
cd tools/mbridge && uv tool install . --force
```

## Architecture Patterns

### Recommended Project Structure
```
tools/mbridge/
├── pyproject.toml
├── src/
│   └── mbridge/
│       ├── __init__.py
│       ├── cli.py           # Root Click group + global options
│       ├── device.py        # device group: list, boot, info
│       ├── app.py           # app group: list, foreground, launch, open-url
│       ├── action.py        # Placeholder group (Phase 8-9)
│       ├── verify.py        # Placeholder group (Phase 9)
│       ├── ui.py            # Placeholder group (Phase 8)
│       ├── platforms/
│       │   ├── __init__.py
│       │   ├── ios.py       # xcrun simctl wrapper
│       │   └── android.py   # adb wrapper
│       └── coords.py        # Coordinate conversion utilities
```

Rationale for package structure over flat: Phase 8-9 will add UI parsing, element finding, and OCR modules. Starting with packages avoids reorganization later. The `platforms/` subpackage isolates all platform-specific subprocess calls.

### Pattern 1: Click Nested Groups
**What:** Each command group lives in its own module, registered via `cli.add_command()`
**When to use:** All command groups
**Example:**
```python
# cli.py
import click
from mbridge.device import device
from mbridge.app import app

@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.pass_context
def cli(ctx, verbose):
    ctx.ensure_object(dict)
    ctx.obj['verbose'] = verbose

cli.add_command(device)
cli.add_command(app)

# device.py
import click

@click.group()
def device():
    """Manage connected devices."""
    pass

@device.command('list')
@click.option('--platform', type=click.Choice(['ios', 'android']), help='Filter by platform')
def list_devices(platform):
    """List connected iOS simulators and Android emulators."""
    ...
```
Source: [Click docs - Commands and Groups](https://click.palletsprojects.com/en/stable/commands-and-groups/)

### Pattern 2: Device ID as Required Argument
**What:** All device-targeting commands take device_id as a positional argument
**When to use:** Every command except `device list`
**Example:**
```python
@device.command()
@click.argument('device_id')
def info(device_id):
    """Show extended device info including screen dimensions."""
    ...

@device.command()
@click.argument('device_id')
def boot(device_id):
    """Boot a device."""
    ...
```

### Pattern 3: JSON-First Output
**What:** All commands output JSON to stdout, errors to stderr
**When to use:** Every command
**Example:**
```python
import json, sys

def output(data):
    click.echo(json.dumps(data, indent=2))

def error(message, code=1):
    click.echo(json.dumps({"error": message}), err=True)
    sys.exit(code)
```

### Pattern 4: Lazy Tool Check
**What:** Check for xcrun/adb at command invocation, not at CLI startup
**When to use:** Every platform-specific command
**Example:**
```python
import shutil

def require_tool(name):
    if not shutil.which(name):
        error(f"{name} not found. {'Install Xcode Command Line Tools.' if name == 'xcrun' else 'Install Android SDK Platform-Tools.'}")
```

### Pattern 5: Platform Subprocess Wrapper
**What:** Thin wrapper around subprocess.run with JSON parsing and error handling
**When to use:** All xcrun/adb calls
**Example:**
```python
import subprocess, json

def run_cmd(args, parse_json=False):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    if parse_json:
        return json.loads(result.stdout)
    return result.stdout.strip()
```

### Anti-Patterns to Avoid
- **Global tool checks at import time:** Breaks CLI help on machines without xcrun/adb. Check lazily per-command.
- **Platform detection via sys.platform:** mbridge should check for available tools, not the host OS. A macOS machine with adb can target Android devices.
- **Human-readable default output:** JSON-first. The primary consumer is SKILL.md instructions, not humans reading terminal output.
- **Auto-selecting device ID:** User decision: device ID is always required. Never guess.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI framework | Custom argparse wrappers | Click groups/commands | Help text, error handling, type validation built-in |
| JSON output formatting | Custom serializer | json.dumps with indent=2 | Standard, matches mobilecli patterns |
| Tool path detection | PATH parsing | shutil.which | Cross-platform, handles edge cases |
| Device list merging | Custom dict merging | Simple list concatenation | iOS and Android lists are independent, no merge logic needed |

**Key insight:** The complexity in this phase is in parsing platform tool outputs, not in the CLI framework. Click and stdlib handle everything else.

## Common Pitfalls

### Pitfall 1: xcrun simctl JSON Structure
**What goes wrong:** Assuming devices are a flat list. They're keyed by runtime string.
**Why it happens:** The JSON structure uses `{"devices": {"com.apple.CoreSimulator.SimRuntime.iOS-26-2": [...]}}`.
**How to avoid:** Iterate `data["devices"].items()` and extract runtime/os_version from the key string.
**Warning signs:** Empty device list when simulators exist.

Verified JSON structure (from local machine):
```json
{
  "devices": {
    "com.apple.CoreSimulator.SimRuntime.iOS-26-2": [
      {
        "lastBootedAt": "2026-03-12T14:26:36Z",
        "dataPath": "/Users/.../data",
        "dataPathSize": 5379002368,
        "logPath": "/Users/.../logs",
        "udid": "59564D72-...",
        "isAvailable": true,
        "logPathSize": 696320,
        "deviceTypeIdentifier": "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro",
        "state": "Shutdown",
        "name": "iPhone 17 Pro"
      }
    ]
  }
}
```

### Pitfall 2: adb devices Output Parsing
**What goes wrong:** adb has no JSON output mode. Output is plain text with variable whitespace.
**Why it happens:** adb predates JSON-everywhere tooling.
**How to avoid:** Parse `adb devices -l` line by line. Format: `<serial>\t<state> <key:value pairs>`.
**Warning signs:** Parsing breaks on device names with spaces or USB path formats.

Verified output format (from local machine):
```
List of devices attached
b057f32f               device usb:2-1 product:CPH2581EEA model:CPH2581 device:OP595DL1 transport_id:36
```

Fields available via `-l`: serial, state, usb path, product, model, device codename, transport_id.

### Pitfall 3: iOS Simulator Screen Dimensions
**What goes wrong:** Using device type info for screen size (doesn't include scale factor).
**Why it happens:** `xcrun simctl list devicetypes` has device names but no screen dimensions.
**How to avoid:** Use `xcrun simctl getenv <udid> SIMULATOR_MAINSCREEN_WIDTH/HEIGHT/SCALE` for booted simulators. For shutdown simulators, use `xcrun simctl io <udid> enumerate` which provides display info without booting.
**Warning signs:** Coordinates work on one device but not another.

Verified values (iPhone 17 Pro simulator):
- SIMULATOR_MAINSCREEN_WIDTH: 1206
- SIMULATOR_MAINSCREEN_HEIGHT: 2622
- SIMULATOR_MAINSCREEN_SCALE: 3.000000
- `simctl io enumerate` shows: Default width: 1206, Default height: 2622

### Pitfall 4: Android Screen Size Has Override vs Physical
**What goes wrong:** Using physical size instead of override size for coordinate calculations.
**Why it happens:** `adb shell wm size` may return both "Physical size" and "Override size". Apps see the override.
**How to avoid:** Parse both lines, prefer override if present.
**Warning signs:** Taps land at wrong positions on devices with display scaling.

Verified output (real device):
```
Physical size: 1440x3168
Override size: 1080x2376
```

### Pitfall 5: Android Density vs iOS Scale
**What goes wrong:** Confusing Android density (DPI) with iOS scale factor (@2x/@3x).
**Why it happens:** iOS scale is a simple multiplier (1, 2, 3). Android density is DPI (160, 320, 480, 640). They're not the same concept.
**How to avoid:** For coordinate conversion, iOS divides by scale. Android uses raw pixel coordinates from `wm size` (override). Android density is informational only -- taps use pixel coordinates.
**Warning signs:** Coordinate conversion applies iOS logic to Android or vice versa.

### Pitfall 6: Emulator vs Real Device Detection
**What goes wrong:** No reliable single field to distinguish emulator from real device.
**Why it happens:** adb serial format varies: emulator uses `emulator-XXXX`, real devices use hardware serial.
**How to avoid:** For Android, check if serial matches `emulator-\d+` pattern. For iOS, `xcrun simctl` only lists simulators -- real devices need `xcrun xctrace list devices` or similar.
**Warning signs:** device `type` field is wrong for edge cases.

## Code Examples

### pyproject.toml
```toml
[project]
name = "mbridge"
version = "0.1.0"
description = "Mobile device bridge CLI"
requires-python = ">=3.12"
dependencies = [
    "click>=8.0",
]

[project.scripts]
mbridge = "mbridge.cli:cli"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```
Source: [uv CLI app guide](https://mathspp.com/blog/using-uv-to-build-and-install-python-cli-apps), [Python Packaging Guide](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)

### iOS Device Discovery
```python
def list_ios_devices():
    data = run_cmd(["xcrun", "simctl", "list", "devices", "--json"], parse_json=True)
    devices = []
    for runtime_key, runtime_devices in data.get("devices", {}).items():
        os_version = parse_runtime_version(runtime_key)
        for d in runtime_devices:
            if not d.get("isAvailable", False):
                continue
            devices.append({
                "id": d["udid"],
                "name": d["name"],
                "platform": "ios",
                "type": "simulator",
                "state": d["state"].lower(),
                "os_version": os_version,
            })
    return devices
```

### Android Device Discovery
```python
def list_android_devices():
    output = run_cmd(["adb", "devices", "-l"])
    devices = []
    for line in output.splitlines()[1:]:
        if not line.strip() or "offline" in line:
            continue
        parts = line.split()
        serial = parts[0]
        props = dict(p.split(":", 1) for p in parts[2:] if ":" in p)
        device_type = "emulator" if serial.startswith("emulator-") else "physical"
        os_version = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.build.version.release"])
        devices.append({
            "id": serial,
            "name": props.get("model", serial),
            "platform": "android",
            "type": device_type,
            "state": "booted",
            "os_version": os_version,
        })
    return devices
```

### iOS Device Info (Extended)
```python
def get_ios_device_info(device_id):
    base = get_ios_device_base(device_id)
    width = int(run_cmd(["xcrun", "simctl", "getenv", device_id, "SIMULATOR_MAINSCREEN_WIDTH"]))
    height = int(run_cmd(["xcrun", "simctl", "getenv", device_id, "SIMULATOR_MAINSCREEN_HEIGHT"]))
    scale = float(run_cmd(["xcrun", "simctl", "getenv", device_id, "SIMULATOR_MAINSCREEN_SCALE"]))
    base.update({
        "screen": {"width": width, "height": height, "scale": scale},
        "data_path": get_device_data_path(device_id),
    })
    return base
```

Note: `simctl getenv` requires the device to be booted. For shutdown devices, fall back to `simctl io <udid> enumerate` and parse the text output.

### Android Device Info (Extended)
```python
def get_android_device_info(device_id):
    base = get_android_device_base(device_id)
    size_output = run_cmd(["adb", "-s", device_id, "shell", "wm", "size"])
    density_output = run_cmd(["adb", "-s", device_id, "shell", "wm", "density"])
    width, height = parse_wm_size(size_output)
    density = parse_wm_density(density_output)
    arch = run_cmd(["adb", "-s", device_id, "shell", "getprop", "ro.product.cpu.abi"])
    sdk = run_cmd(["adb", "-s", device_id, "shell", "getprop", "ro.build.version.sdk"])
    base.update({
        "screen": {"width": width, "height": height, "density": density},
        "architecture": arch,
        "sdk_version": sdk,
    })
    return base
```

### Coordinate Conversion Module
```python
def logical_to_physical(x, y, scale):
    """Convert logical points to physical pixels (iOS)."""
    return round(x * scale), round(y * scale)

def physical_to_logical(x, y, scale):
    """Convert physical pixels to logical points (iOS)."""
    return round(x / scale), round(y / scale)
```

Key insight from rn-debugger MCP research:
- iOS WDA uses **point space** coordinates, not pixels. Conversion: `pointX = round(pixelX / scaleFactor)`
- Android adb input uses **pixel coordinates** directly from `wm size` (override if present)
- The coord module provides these conversions; calling code decides which to use based on platform

### Setup.js for uv Auto-Install
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const mbridgeDir = path.join(__dirname, '..', '..', 'tools', 'mbridge');

try {
  execSync('mbridge --help', { stdio: 'pipe' });
  console.log('mbridge is already installed.');
  process.exit(0);
} catch {}

try {
  execSync('which uv', { stdio: 'pipe' });
} catch {
  console.error('uv is not installed. Install via: curl -LsSf https://astral.sh/uv/install.sh | sh');
  process.exit(1);
}

execSync(`uv tool install "${mbridgeDir}" --force`, { stdio: 'inherit' });
console.log('mbridge installed successfully.');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setup.py + pip install | pyproject.toml + uv tool install | 2023-2024 | Simpler packaging, faster installs |
| argparse | Click (or Typer) | Long-standing | Better DX, auto-help, nested groups |
| mobilecli (Go binary) | mbridge (Python) | This phase | Python enables easier AI-driven extension |

**Deprecated/outdated:**
- setup.py: Use pyproject.toml with hatchling build backend
- pip install --user: Use uv tool install for CLI tools

## Open Questions

1. **simctl getenv on shutdown devices**
   - What we know: `simctl getenv` requires booted device. `simctl io enumerate` works on shutdown devices but outputs text, not JSON.
   - What's unclear: Whether we should require booting for `device info` or parse the text output from `io enumerate`.
   - Recommendation: Try `getenv` first (fast for booted devices), fall back to parsing `io enumerate` text output for shutdown devices. Document that screen info is only available for booted or previously-booted devices.

2. **iOS real device support in device list**
   - What we know: `xcrun simctl` only lists simulators. Real iOS devices need `xcrun xctrace list devices` or `idevice_id` from libimobiledevice.
   - What's unclear: Which tool to use for real device discovery.
   - Recommendation: Phase 7 focuses on simulators/emulators per requirements. Real device discovery can be added later without architectural changes since the output format is the same.

3. **Android emulator name resolution**
   - What we know: `adb devices -l` gives model codename (e.g., "CPH2581"), not friendly name. Emulators may show different info.
   - What's unclear: How to get friendly names for Android emulators.
   - Recommendation: Use `model` from `adb devices -l` properties, or `ro.product.model` from getprop. It's good enough for device identification.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual integration tests (user decision: no unit tests) |
| Config file | None -- manual checklist |
| Quick run command | `mbridge device list` |
| Full suite command | Manual: run all commands against 4 environments |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MBRD-01 | CLI installs via uv tool install | manual | `cd tools/mbridge && uv tool install . --force && mbridge --help` | N/A |
| MBRD-01 | Click command structure with help text | manual | `mbridge --help && mbridge device --help && mbridge app --help` | N/A |
| MBRD-02 | iOS simulator discovery | manual | `mbridge device list --platform ios` | N/A |
| MBRD-02 | Android emulator/device discovery | manual | `mbridge device list --platform android` | N/A |
| MBRD-02 | Combined device list | manual | `mbridge device list` | N/A |

### Sampling Rate
- **Per task commit:** `mbridge --help && mbridge device list`
- **Per wave merge:** Full manual test on available environments
- **Phase gate:** All commands verified on at least iOS simulator + Android (device or emulator)

### Wave 0 Gaps
None -- user explicitly chose integration-only testing with manual verification. No test framework to set up.

## Sources

### Primary (HIGH confidence)
- Local machine verification: `xcrun simctl list devices --json` output structure, field names, runtime key format
- Local machine verification: `adb devices -l` output format, property key:value pairs
- Local machine verification: `xcrun simctl getenv` for screen dimensions (WIDTH=1206, HEIGHT=2622, SCALE=3.0)
- Local machine verification: `adb shell wm size` physical vs override, `wm density` format
- [Click docs - Commands and Groups](https://click.palletsprojects.com/en/stable/commands-and-groups/) - group nesting, @pass_context, help text
- [Click docs - Advanced Groups](https://click.palletsprojects.com/en/stable/commands/) - context passing, global options
- [Python Packaging Guide](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/) - pyproject.toml structure
- [Click PyPI](https://pypi.org/project/click/) - version 8.3.1 latest

### Secondary (MEDIUM confidence)
- [uv CLI app guide](https://mathspp.com/blog/using-uv-to-build-and-install-python-cli-apps) - `uv tool install . -e` syntax, --force flag
- [nkmk uv CLI tools](https://note.nkmk.me/en/python-uv-cli-tool/) - `uv init --app --package` scaffold, src layout
- [thisDaveJ uv packaging](https://thisdavej.com/packaging-python-command-line-apps-the-modern-way-with-uv/) - pyproject.toml [project.scripts] format, hatchling build backend
- [rn-debug-mcp](https://github.com/zersys/rn-debug-mcp) - coordinate handling patterns (iOS point-space vs Android pixels), adb/simctl command usage

### Tertiary (LOW confidence)
- None -- all findings verified against local machine or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Click 8.x and uv are well-documented, verified against official sources
- Architecture: HIGH - Click group nesting pattern verified against official docs; project structure follows uv conventions
- Pitfalls: HIGH - All device output formats verified on local machine with real outputs
- Coordinate system: MEDIUM - Patterns from rn-debugger MCP confirmed the iOS point-space model, but edge cases (rotation, notch insets) not yet investigated

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain, slow-moving APIs)
