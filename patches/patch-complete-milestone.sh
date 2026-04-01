#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/complete-milestone.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="TB_PATCH: forgetful-milestone-save"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP complete-milestone: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK complete-milestone: already patched"
  exit 0
fi

TMPFILE=$(mktemp)
cat > "$TMPFILE" << PATCH_EOF

<step name="save_to_forgetful">

<!-- $MARKER -->
Save key milestone learnings to Forgetful for cross-project memory.

**Skip if:** Forgetful is not configured (check ~/.claude.json for mcpServers.forgetful.url).

**Step 1: Extract candidate memories**
\`\`\`bash
MILESTONE_CANDIDATES=\$(node "$PLUGIN_ROOT/scripts/gsd-milestone-save.js" "\${VERSION}" ".planning/RETROSPECTIVE.md" 2>/dev/null || true)
\`\`\`

If MILESTONE_CANDIDATES is empty, skip this step silently.

**Step 2: Process obsolescence**
Parse MILESTONE_CANDIDATES JSON. For any item with \`"action": "obsolete"\`:
- Call \`execute_forgetful_tool\` with \`tool_name: "mark_memory_obsolete"\`, \`arguments: { memory_id: "{id}", reason: "Superseded by fresh milestone v\${VERSION} save" }\`

**Step 3: Present candidates for user approval**
For each item with \`"action": "create"\`:
- Display: title, content preview (first 200 chars), importance, tags
- Ask user: approve / edit / skip
- If approved: call \`execute_forgetful_tool\` with \`tool_name: "create_memory"\`, \`arguments: { title, content, importance, tags, project_ids: [projectId] }\`
- If edit: let user modify content, then save
- If skip: move to next candidate

**Step 4: Summary**
Display count of saved/skipped/obsoleted memories.

</step>
PATCH_EOF

# Use awk to insert content from TMPFILE before <step name="update_state">
# This avoids the sed 'r' limitation (which only inserts AFTER a match)
NEWFILE=$(mktemp)
awk -v insertfile="$TMPFILE" '
  /<step name="update_state">/ {
    while ((getline line < insertfile) > 0) print line
    close(insertfile)
  }
  { print }
' "$WORKFLOW" > "$NEWFILE"

mv "$NEWFILE" "$WORKFLOW"
rm "$TMPFILE"

echo "OK complete-milestone: patched"
