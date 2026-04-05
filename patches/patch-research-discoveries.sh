#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/research-phase.md"
MARKER="TB_PATCH: research-general-discoveries"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP research-discoveries: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK research-discoveries: already patched"
  exit 0
fi

TMPFILE=$(mktemp)
cat > "$TMPFILE" << 'PATCH_EOF'
<!-- TB_PATCH: research-general-discoveries -->
After writing the standard RESEARCH.md sections, if you discovered any findings valuable
beyond this specific phase, add a `## General Discoveries` section at the END of RESEARCH.md.

Only include items that meet the save criteria. If nothing qualifies, omit the section entirely.

Each discovery entry should be a ### subsection with these fields:
- **Title:** Concise descriptive title (max 200 chars)
- **Content:** Self-contained description with context (max 2000 chars)
- **Scope:** general | project
- **Domain:** The technical domain (e.g., "claude-code-plugins", "bash-scripting")
- **Confidence:** verified (confirmed via official docs) | reported (from community/single source)
- **Tags:** 2-5 comma-separated descriptive tags

Save criteria (include if ANY): surprising or contradicts assumptions, hard-won debugging knowledge,
cross-project applicable, actionable and specific, temporal with clear expiry.
Skip criteria (exclude if ANY): one-off detail specific to this phase only, already documented in
CLAUDE.md or project docs, easily rediscoverable, common knowledge.

PATCH_EOF

awk '/^Phase description:/ { while ((getline line < "'"$TMPFILE"'") > 0) print line; print "" } { print }' "$WORKFLOW" > "${WORKFLOW}.tmp"
mv "${WORKFLOW}.tmp" "$WORKFLOW"
rm "$TMPFILE"

echo "OK research-discoveries: patched"
