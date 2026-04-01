#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/new-milestone.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="TB_PATCH: forgetful-milestone-context"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP new-milestone: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK new-milestone: already patched"
  exit 0
fi

TMPFILE=$(mktemp)
cat > "$TMPFILE" << PATCH_EOF

<!-- $MARKER -->
\`\`\`bash
FORGETFUL_CONTEXT=\$(node "$PLUGIN_ROOT/scripts/gsd-project-context.js" "\$PROJECT_DOMAIN" 2>/dev/null || true)
\`\`\`

If FORGETFUL_CONTEXT is non-empty, include the following block inside each researcher Task() prompt's \`<milestone_context>\` section:
\`\`\`
<forgetful_context>
\${FORGETFUL_CONTEXT}
</forgetful_context>
\`\`\`

PATCH_EOF

sed -i '' "/^## 8\. Research Decision$/r $TMPFILE" "$WORKFLOW"
rm "$TMPFILE"

echo "OK new-milestone: patched"
