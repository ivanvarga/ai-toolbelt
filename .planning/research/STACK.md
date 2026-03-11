# Technology Stack

**Project:** ai-toolbelt
**Researched:** 2026-03-11

## Recommended Stack

This project spans three distinct domains: (1) a Claude Code plugin with skills/commands/hooks, (2) bash-based credential management via macOS Keychain, and (3) a Python CLI tool (mbridge) for mobile automation. The stack reflects this hybrid nature.

### Plugin Layer (Claude Code Plugin System)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Claude Code Plugin System | 1.0.33+ | Plugin packaging and distribution | Native distribution mechanism for Claude Code. Supports skills, commands, agents, hooks, MCP servers, LSP servers. Git-based, works with private repos. No alternative exists. | HIGH |
| `.claude-plugin/plugin.json` | N/A | Plugin manifest | Required by Claude Code. Defines name (namespace prefix), description, version, author. | HIGH |
| `.claude-plugin/marketplace.json` | N/A | Self-hosted marketplace | Enables `/plugin marketplace add` for install and auto-updates. Single-plugin marketplace pointing to self (`source: "./"`) is the cleanest private distribution pattern. | HIGH |
| `hooks.json` | N/A | Lifecycle hooks | SessionStart hook for context injection (proven by superpowers plugin). PostToolUse for optional validation. | HIGH |

### Shell Scripts (Credential Management + Skill Helpers)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Bash | 3.2+ (macOS default) | Credential setup scripts, skill helpers | Already proven by gh-upload pattern. `security` CLI for Keychain is bash-native. Keep scripts portable to macOS default bash. | HIGH |
| macOS `security` CLI | Built-in | Keychain CRUD | `security add-generic-password`, `find-generic-password`, `delete-generic-password`. Already proven in gh-upload. Direct, no dependencies, no Python needed. | HIGH |
| `jq` | 1.7+ | JSON parsing in shell scripts | Already used extensively by mobilecli skill for UI dump queries. Essential for parsing JSON responses in bash helpers. | HIGH |
| `gh` CLI | 2.x | GitHub API access | Already used by upload.sh for repo detection. Required for GitHub-related skills. | HIGH |

### Python Layer (mbridge CLI)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.12+ | mbridge runtime | 3.12 is the sweet spot: widely available, stable, has all modern features. Avoid 3.14 (too new, binary compatibility issues with some C extensions). Pin to `>=3.12,<3.14` in pyproject.toml. | HIGH |
| uv | 0.10.x | Python project management | Replaces pip, venv, pipx in one tool. 10-100x faster than pip. Handles Python version management, virtual environments, dependency locking, and tool installation. Industry standard for new Python projects in 2025-2026. | HIGH |
| Click | 8.1.x | CLI framework | Battle-tested, excellent for nested command groups (`mbridge dump`, `mbridge tap`, `mbridge ocr`). Typer adds unnecessary complexity for a CLI tool that won't have end-user docs. Click is what Typer wraps anyway. | HIGH |
| pytesseract | 0.3.x | OCR text recognition | Wraps Tesseract C++ engine. Lightweight, well-maintained, sufficient for UI element text verification. Tesseract installed via Homebrew as system dependency. | MEDIUM |
| Pillow | 11.x | Image processing | Required by pytesseract for image handling. Also useful for screenshot cropping/preprocessing before OCR. | HIGH |
| lxml | 5.x | XML parsing | For parsing Android UI hierarchy XML dumps from `uiautomator2`. Fast C-based parser, handles large XML trees efficiently. | HIGH |
| subprocess | stdlib | Device commands | `xcrun simctl` for iOS, `adb` for Android. Use `subprocess.run()` with list args (never `shell=True`). No wrapper library needed -- direct subprocess is simpler and more debuggable. | HIGH |

### Build and Distribution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `pyproject.toml` | PEP 621 | Python project config | Standard Python project metadata. Defines `[project.scripts]` entry point for `mbridge` CLI command. | HIGH |
| `uv tool install` | 0.10.x | mbridge installation | `uv tool install .` from the repo installs mbridge as a globally available CLI tool with isolated venv. Clean, fast, handles dependencies automatically. | HIGH |
| Bash install script | N/A | One-command setup | Single `install.sh` that: (1) installs uv if missing, (2) `uv tool install` for mbridge, (3) registers plugin marketplace. | HIGH |
| Git (private GitHub repo) | N/A | Distribution | Private repo on GitHub. Plugin installed via `/plugin marketplace add owner/repo`. mbridge installed via the install script after clone. | HIGH |

### Dev Dependencies

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| shellcheck | 0.10.x | Bash linting | Validate all shell scripts. Install via Homebrew. | HIGH |
| ruff | 0.11.x | Python linting + formatting | Replaces flake8, black, isort for Python. Fast (Rust-based, same team as uv). | HIGH |
| pyright | 1.1.x | Python type checking | Static type analysis for mbridge Python code. | HIGH |
| pytest | 8.x | Python testing | Unit tests for mbridge parsing/command logic. | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Python CLI framework | Click 8.x | Typer | Typer adds a thin layer over Click. For a tool Claude Code invokes (not humans browsing help), Click's explicit decorator pattern is simpler and more debuggable. |
| Python CLI framework | Click 8.x | argparse | Too verbose for nested subcommands. Click's decorator pattern is cleaner for `mbridge dump ui`, `mbridge io tap`, etc. |
| Python package manager | uv | pip + venv | uv is 10-100x faster, handles Python versions, lockfiles, tool installs. pip+venv requires manual venv management. |
| Python package manager | uv | Poetry | Poetry is slower, heavier, and uv has surpassed it in adoption for new projects. |
| OCR | pytesseract | EasyOCR | EasyOCR pulls in PyTorch (1GB+ dependency). For reading UI element text, Tesseract is sufficient and vastly lighter. |
| OCR | pytesseract | Apple Vision framework (via pyobjc) | macOS-only, complex bridging. pytesseract works on both macOS and Linux (CI). |
| Keychain access | `security` CLI via bash | Python `keyring` library | Keychain access is only needed in setup scripts (run once). Bash `security` command is simpler, already proven, zero dependencies. No need to pull keyring into the Python dependency tree. |
| Plugin distribution | Self-hosted marketplace | npm package (GSD-style) | Plugin system is native to Claude Code and purpose-built. npm approach requires custom hooks for update checking. Marketplace gives free auto-update support. |
| Mobile automation | Direct subprocess (xcrun/adb) | Appium | Appium is a heavyweight server-based framework for cross-platform test suites. mbridge needs direct, fast device commands -- Appium adds latency and complexity for no benefit. |
| Mobile automation | Direct subprocess | facebook-wda / tidevice | These wrap WebDriverAgent for iOS. mobilecli already handles iOS via xcrun simctl. mbridge replaces mobilecli's Node.js layer with Python, not the underlying device APIs. |
| UI parsing | lxml + JSON stdlib | BeautifulSoup | lxml is faster for XML (Android UI dumps). JSON stdlib handles iOS JSON dumps. BeautifulSoup adds unnecessary overhead. |

## Architecture Decision: mbridge vs mobilecli

mbridge replaces mobilecli's role but as a Python CLI. Key differences:

- **mobilecli** is a Node.js global npm package (currently `mobilecli@0.1.58`). It wraps `xcrun simctl` and `adb` commands.
- **mbridge** will be Python, wrapping the same underlying tools (`xcrun simctl`, `adb`) but adding OCR verification and smarter UI dump parsing.
- mbridge does NOT need to replicate mobilecli 1:1 initially. It starts with UI dump + OCR core, then adds interaction commands.
- The mobilecli skill SKILL.md in `~/.claude/skills/mobilecli/` will be migrated and updated to reference mbridge commands instead.

## Installation

```bash
# System dependencies (Homebrew)
brew install uv tesseract jq shellcheck

# mbridge (from repo root, uses tools/mbridge/)
cd tools/mbridge && uv tool install .

# Plugin (marketplace approach)
# From Claude Code: /plugin marketplace add owner/ai-toolbelt

# Plugin (dev/testing)
claude --plugin-dir ./path/to/ai-toolbelt

# Dev dependencies (Python, from tools/mbridge/)
cd tools/mbridge && uv sync --dev
```

## File Structure Preview

```
ai-toolbelt/                          # Plugin root = repo root
  .claude-plugin/
    plugin.json                       # Plugin manifest
    marketplace.json                  # Self-marketplace for distribution
  commands/                           # Slash commands (markdown files)
  skills/                             # Agent skills (SKILL.md in subdirs)
  hooks/
    hooks.json                        # Hook definitions
    session-start.sh                  # Context injection hook
  scripts/                            # Shared helper scripts
    credentials/
      setup-all.sh                    # Master credential setup
      setup-gh-upload.sh
      setup-jira.sh
      setup-sentry.sh
      setup-contentful.sh
  tools/
    mbridge/                          # Python CLI (standalone package)
      pyproject.toml                  # Python project config
      uv.lock                        # Dependency lockfile
      src/
        mbridge/
          __init__.py
          cli.py                      # Click CLI entry point
          commands/                   # CLI subcommand modules
            dump.py
            io.py
            ocr.py
            device.py
          parsers/                    # UI dump parsers
            ios.py
            android.py
          utils/
            subprocess.py             # Safe subprocess wrappers
  config/
    CLAUDE.md                         # Global instructions template
  bin/
    install.sh                        # One-command installer
    update.sh                         # Update mechanism
  CLAUDE.md                           # Plugin-level instructions
```

## Sources

- Claude Code Plugin Docs: https://code.claude.com/docs/en/plugins (HIGH confidence, official)
- Claude Code Marketplace Docs: https://code.claude.com/docs/en/plugin-marketplaces (HIGH confidence, official)
- uv Documentation: https://docs.astral.sh/uv/ (HIGH confidence, official)
- uv PyPI: https://pypi.org/project/uv/ -- latest version 0.10.9 (HIGH confidence)
- Click Documentation: https://click.palletsprojects.com/en/stable/ (HIGH confidence, official)
- Superpowers plugin structure: local inspection of `~/.claude/plugins/cache/superpowers-marketplace/` (HIGH confidence, direct observation)
- gh-upload skill: local inspection of `~/.claude/skills/gh-upload/` (HIGH confidence, direct observation)
- mobilecli skill: local inspection of `~/.claude/skills/mobilecli/` (HIGH confidence, direct observation)
- pytesseract: https://pypi.org/project/pytesseract/ (MEDIUM confidence, may need runtime validation)
- lxml: https://lxml.de/ -- latest version 5.x (HIGH confidence, official)
- Python CLI comparison: https://click.palletsprojects.com/en/stable/why/ (HIGH confidence, official)
- macOS Keychain CLI: https://www.netmeister.org/blog/keychain-passwords.html (HIGH confidence)
- uiautomator2: https://github.com/openatx/uiautomator2 (MEDIUM confidence)
