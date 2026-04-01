#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/plan-phase.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="TB_PATCH: forgetful-plan-context"
MARKER2="TB_PATCH: forgetful-plan-context-planner"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP plan-phase: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK plan-phase: already patched"
  exit 0
fi

TMPFILE1=$(mktemp)
cat > "$TMPFILE1" << PATCH_EOF

<!-- $MARKER -->
\`\`\`bash
FORGETFUL_CONTEXT=\$(node "$PLUGIN_ROOT/scripts/gsd-plan-context.js" "\${PHASE}" "" 2>/dev/null || true)
\`\`\`

If FORGETFUL_CONTEXT is non-empty, include the following block in the researcher's \`<additional_context>\` section:
\`\`\`
<forgetful_context>
\${FORGETFUL_CONTEXT}
</forgetful_context>
\`\`\`

PATCH_EOF

sed -i '' "/^## 5\. Handle Research$/r $TMPFILE1" "$WORKFLOW"
rm "$TMPFILE1"

TMPFILE2=$(mktemp)
cat > "$TMPFILE2" << PATCH_EOF

<!-- $MARKER2 -->
If FORGETFUL_CONTEXT (computed in Step 5) is non-empty, include the following block in the planner's prompt context:
\`\`\`
<forgetful_context>
\${FORGETFUL_CONTEXT}
</forgetful_context>
\`\`\`

PATCH_EOF

sed -i '' "/^## 8\. Spawn gsd-planner Agent$/r $TMPFILE2" "$WORKFLOW"
rm "$TMPFILE2"

echo "OK plan-phase: patched"
