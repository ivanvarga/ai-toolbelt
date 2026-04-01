#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/discuss-phase.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="TB_PATCH: forgetful-discuss-context"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP discuss-phase: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK discuss-phase: already patched"
  exit 0
fi

TMPFILE=$(mktemp)
cat > "$TMPFILE" << PATCH_EOF

<!-- $MARKER -->
\`\`\`bash
FORGETFUL_CONTEXT=\$(node "$PLUGIN_ROOT/scripts/gsd-discuss-context.js" "\${PHASE}" 2>/dev/null || true)
\`\`\`

If FORGETFUL_CONTEXT is non-empty, include it in the prior_decisions context:
\`\`\`
<forgetful_prior_decisions>
\${FORGETFUL_CONTEXT}
</forgetful_prior_decisions>
\`\`\`

PATCH_EOF

sed -i '' '/<step name="load_prior_context">/r '"$TMPFILE" "$WORKFLOW"
rm "$TMPFILE"

echo "OK discuss-phase: patched"
