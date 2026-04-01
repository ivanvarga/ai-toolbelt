#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/research-phase.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="TB_PATCH: forgetful-research-context"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP research-phase: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK research-phase: already patched"
  exit 0
fi

TMPFILE=$(mktemp)
cat > "$TMPFILE" << PATCH_EOF

<!-- $MARKER -->
\`\`\`bash
FORGETFUL_CONTEXT=\$(node "$PLUGIN_ROOT/scripts/gsd-plan-context.js" "\${PHASE}" "" 2>/dev/null || true)
\`\`\`

If FORGETFUL_CONTEXT is non-empty, include the following block in the researcher Task() prompt's \`<additional_context>\` section:
\`\`\`
<forgetful_context>
\${FORGETFUL_CONTEXT}
</forgetful_context>
\`\`\`

PATCH_EOF

sed -i '' '/^<additional_context>$/r '"$TMPFILE" "$WORKFLOW"
rm "$TMPFILE"

echo "OK research-phase: patched"
