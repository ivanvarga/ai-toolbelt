# tb -- Personal Dev Toolkit Plugin

All custom skills, credential management, and dev tools in one Claude Code plugin.

## Install

```bash
claude plugin marketplace add ivarga/ai-toolbelt
claude plugin install tb@tb-marketplace
```

## Usage

Skills are invoked as `/tb:skill-name` in any Claude Code session. The SessionStart hook automatically shows available skills when a session begins.

## Update

Run `/tb:update` to pull the latest changes. The skill handles stashing local changes, pulling, and showing what changed.

## Health Check

Run `/tb:doctor` to verify all plugin components are working correctly.

## Global Config

The plugin distributes a global `CLAUDE.md` to `~/.claude/CLAUDE.md`. Running `/tb:update` automatically copies the latest version from `config/CLAUDE.md`. Running `/tb:doctor` verifies the config is in sync.

## Development

Load the plugin directly from source for local development:

```bash
claude --plugin-dir ./
```

Use `/reload-plugins` to hot-reload changes without restarting Claude Code.

**Known limitation:** Hooks don't fire with `--plugin-dir` (local file-based marketplace issue). To test hooks during development, add the hook definition to `~/.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/ai-toolbelt/hooks/session-start.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

Replace `/absolute/path/to/ai-toolbelt` with the actual path to your local clone.

## Troubleshooting

If Claude doesn't know about `/tb:*` skills after install, the SessionStart hook context may not be surfacing. Copy the hook definition above into `~/.claude/settings.local.json` with the absolute path to your installed plugin (typically `~/.claude/plugins/cache/tb-marketplace/tb/<version>/hooks/session-start.sh`).
