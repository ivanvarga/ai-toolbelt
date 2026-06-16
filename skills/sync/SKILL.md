---
name: tb:sync
description: Use when setting up or refreshing the tb plugin's shared CLAUDE.md guidelines on this machine. Copies the plugin's shared guidelines to a stable path and wires a single managed @import into the global ~/.claude/CLAUDE.md, without touching your own content. Run once after installing tb, and again after each `claude plugin update` to refresh. Triggers on "sync tb guidelines", "set up tb shared guidelines", "wire tb CLAUDE.md", "refresh shared guidelines".
---

# tb:sync

Install or refresh the tb plugin's shared guidelines into this machine's global Claude config — **without modifying any of your own CLAUDE.md content.**

What it does:
1. Copies the plugin's `context/shared-guidelines.md` to the stable path `~/.claude/tb/shared-guidelines.md` (overwriting the previous synced copy). The plugin's own install path is version-stamped and changes every release, so it can't be imported directly — this stable copy is what your CLAUDE.md points at.
2. Ensures the global `~/.claude/CLAUDE.md` contains a single managed `@import` block pointing at that stable path — added once, idempotently. Everything else in your CLAUDE.md is left untouched.

Run it once after installing tb, and re-run after each `claude plugin update` to pick up new guidelines.

## Steps

### 1. Copy the shared file to the stable path

```bash
SRC="${CLAUDE_SKILL_DIR}/../../context/shared-guidelines.md"
DEST_DIR="$HOME/.claude/tb"
DEST="$DEST_DIR/shared-guidelines.md"

if [ ! -f "$SRC" ]; then
  echo "ERROR: shared-guidelines.md not found at $SRC"; exit 1
fi
mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
echo "Synced shared guidelines -> $DEST"
```

### 2. Ensure the managed @import block in global CLAUDE.md

```bash
GLOBAL_MD="$HOME/.claude/CLAUDE.md"
MARKER="<!-- tb:guidelines (managed) -->"
touch "$GLOBAL_MD"
if grep -qF "$MARKER" "$GLOBAL_MD"; then
  echo "Import already present in $GLOBAL_MD — left as is."
else
  printf '\n%s\n@~/.claude/tb/shared-guidelines.md\n' "$MARKER" >> "$GLOBAL_MD"
  echo "Added managed import block to $GLOBAL_MD"
fi
```

### 3. Report

Confirm to the user that the guidelines are synced and imported globally, and remind them to re-run `/tb:sync` after future `claude plugin update`s (the synced copy is a snapshot, not a live link).

If the now-centralized sections still appear inline in their own CLAUDE.md (global or project), point that out so they can delete the duplicates — but do **not** edit their CLAUDE.md content beyond the single managed import block this skill manages.
