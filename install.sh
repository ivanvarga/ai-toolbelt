#!/usr/bin/env bash
set -euo pipefail

REPO_URL="ivanvarga/ai-toolbelt"
MARKETPLACE_NAME="tb-marketplace"
PLUGIN_NAME="tb"
SETTINGS_FILE="$HOME/.claude/settings.json"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_NAME}"

echo "=== tb — Personal Dev Toolkit Plugin ==="
echo ""

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install it from https://jqlang.github.io/jq/download/"
    exit 1
fi

if ! command -v claude &>/dev/null; then
    echo "Error: Claude Code CLI not found."
    echo "Install it from https://docs.anthropic.com/en/docs/claude-code"
    exit 1
fi

mkdir -p "$HOME/.claude"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo '{}' > "$SETTINGS_FILE"
    echo "Created $SETTINGS_FILE"
fi

ALLOW_RULES='[
  "Bash(source *)",
  "Bash(mobilecli *)",
  "Bash(adb *)",
  "Bash(cat *)",
  "Bash(jq *)",
  "Bash(curl *)",
  "Bash(cd *)",
  "Bash(cd * && git *)",
  "Bash(git status *)",
  "Bash(git diff *)",
  "Bash(git log *)",
  "Bash(git add *)",
  "Bash(git commit *)",
  "Bash(git branch *)",
  "Bash(git checkout *)",
  "Bash(git remote *)",
  "Bash(git stash *)",
  "Bash(gh *)",
  "Bash(node *)",
  "Bash(bash *)",
  "Bash(ls *)",
  "Bash(diff *)",
  "Bash(chmod *)",
  "Bash(find *)",
  "Bash(grep *)",
  "Bash(sed *)",
  "Bash(head *)",
  "Bash(tail *)",
  "Bash(npx *)",
  "Bash(npm *)",
  "Bash(yarn *)",
  "Bash(pnpm *)",
  "Bash(mkdir *)",
  "Bash(rm -rf node_modules*)",
  "Bash(rm -rf .expo*)",
  "Bash(rm -rf dist*)",
  "Bash(rm -rf build*)",
  "Read",
  "Edit",
  "Write",
  "Skill(tb:*)"
]'

DENY_RULES='[
  "Bash(rm -rf /*)",
  "Bash(rm -rf ~/*)",
  "Bash(cat */.env)",
  "Bash(cat */.env.*)",
  "Bash(cat */.secret*)",
  "Bash(cat */.credentials*)",
  "Bash(cat */.netrc)",
  "Bash(cat */.npmrc)",
  "Bash(cat */.yarnrc*)",
  "Bash(cat */.pypirc)",
  "Bash(cat */.gem/credentials)",
  "Bash(cat */.cargo/credentials*)",
  "Bash(cat */.ssh/*)",
  "Bash(cat */.gnupg/*)",
  "Bash(cat */.git-credentials)",
  "Bash(cat */.pgpass)",
  "Bash(cat */.my.cnf)",
  "Bash(cat */.aws/credentials)",
  "Bash(cat */.aws/sso/cache/*)",
  "Bash(cat */.config/gcloud/*credentials*)",
  "Bash(cat */.azure/*token*)",
  "Bash(cat */.docker/config.json)",
  "Bash(cat */.kube/config)",
  "Bash(cat */.config/gh/hosts.yml)",
  "Bash(cat */.vault-token)",
  "Bash(cat */.doppler/*)",
  "Bash(cat */.sentryclirc)",
  "Bash(cat */.terraform.d/credentials*)",
  "Bash(cat */.htpasswd)",
  "Bash(cat */.password-store/*)",
  "Bash(cat */.bash_history)",
  "Bash(cat */.zsh_history)",
  "Bash(cat */.psql_history)",
  "Bash(cat */.node_repl_history)",
  "Bash(cat *.pem)",
  "Bash(cat *.key)",
  "Bash(cat *.p12)",
  "Bash(cat *.pfx)",
  "Bash(cat *.jks)",
  "Bash(cat *.keystore)",
  "Bash(cat *.tfstate)",
  "Bash(cat *.tfvars)",
  "Read(*/.env)",
  "Read(*/.env.*)",
  "Read(*/.secret*)",
  "Read(*/.credentials*)",
  "Read(*/.netrc)",
  "Read(*/.npmrc)",
  "Read(*/.yarnrc*)",
  "Read(*/.pypirc)",
  "Read(*/.gem/credentials)",
  "Read(*/.cargo/credentials*)",
  "Read(*/.ssh/*)",
  "Read(*/.gnupg/*)",
  "Read(*/.git-credentials)",
  "Read(*/.pgpass)",
  "Read(*/.my.cnf)",
  "Read(*/.aws/credentials)",
  "Read(*/.aws/sso/cache/*)",
  "Read(*/.config/gcloud/*credentials*)",
  "Read(*/.azure/*token*)",
  "Read(*/.docker/config.json)",
  "Read(*/.kube/config)",
  "Read(*/.config/gh/hosts.yml)",
  "Read(*/.vault-token)",
  "Read(*/.doppler/*)",
  "Read(*/.sentryclirc)",
  "Read(*/.terraform.d/credentials*)",
  "Read(*/.htpasswd)",
  "Read(*/.password-store/*)",
  "Read(*/.bash_history)",
  "Read(*/.zsh_history)",
  "Read(*/.psql_history)",
  "Read(*/.node_repl_history)",
  "Read(*.pem)",
  "Read(*.key)",
  "Read(*.p12)",
  "Read(*.pfx)",
  "Read(*.jks)",
  "Read(*.keystore)",
  "Read(*.tfstate)",
  "Read(*.tfvars)"
]'

ASK_RULES='[
  "Bash(git push *)",
  "Bash(git push)"
]'

tmp=$(mktemp)
jq --arg key "$PLUGIN_KEY" \
   --argjson allow "$ALLOW_RULES" \
   --argjson deny "$DENY_RULES" \
   --argjson ask "$ASK_RULES" '
  .enabledPlugins[$key] = true |
  .permissions.allow = ((.permissions.allow // []) + $allow | unique) |
  .permissions.deny = ((.permissions.deny // []) + $deny | unique) |
  .permissions.ask = ((.permissions.ask // []) + $ask | unique)
' "$SETTINGS_FILE" > "$tmp" && mv "$tmp" "$SETTINGS_FILE"
echo "Updated $SETTINGS_FILE (plugin + permissions)"

echo ""
echo "Registering marketplace..."
claude plugin marketplace add "$REPO_URL" 2>/dev/null && echo "Marketplace registered." || echo "Marketplace already registered (or Claude CLI not in PATH)."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$SCRIPT_DIR/scripts/paperclip-symlink.sh" || true

echo ""
echo "Done! Next steps:"
echo "  1. Restart Claude Code (or run /reload-plugins in an active session)"
echo "  2. Type /tb: to see available skills"
echo ""
