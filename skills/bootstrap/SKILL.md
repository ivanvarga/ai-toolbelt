---
name: tb:bootstrap
description: Set up GSD, forgetful-plugin, and GSD patches in one command
disable-model-invocation: true
---

# Bootstrap

Set up the complete tb integration environment: GSD, forgetful-plugin, and GSD workflow patches.

## Steps

### 1. Resolve plugin root

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
```

### 2. Check and install GSD

Run the doctor check to detect GSD:

```bash
GSD_RESULT=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
echo "$GSD_RESULT"
```

- If output starts with `PASS`: report "GSD: already installed" with the version from the message (everything after "GSD "), and continue to step 3.
- If output starts with `FAIL`: GSD is not installed. Tell the user to run the install command manually:

  ```
  npx -y get-shit-done-cc@latest --claude --global
  ```

  Explain that GSD's installer may have interactive prompts so it must be run by the user in their terminal. Wait for the user to report completion.

  After the user reports completion, re-run the check:

  ```bash
  GSD_RESULT=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
  echo "$GSD_RESULT"
  ```

  If still `FAIL`, inform the user and ask whether to retry or skip GSD installation. Track whether GSD ended up installed for step 4.

### 3. Check and install forgetful-plugin

Check if forgetful-plugin is already installed by looking for its key in the plugin registry:

```bash
INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"
if [ -f "$INSTALLED_FILE" ] && jq -e '.plugins["forgetful-plugin@forgetful-plugins"]' "$INSTALLED_FILE" >/dev/null 2>&1; then
  FP_VERSION=$(jq -r '.plugins["forgetful-plugin@forgetful-plugins"][0].version' "$INSTALLED_FILE")
  echo "forgetful-plugin: already installed (v${FP_VERSION})"
else
  echo "forgetful-plugin: not found"
fi
```

- If already installed (jq succeeds): report "forgetful-plugin: already installed (v{VERSION})" and continue to step 4.
- If not installed (jq fails or file missing): install via the Claude plugin CLI:

  ```bash
  claude plugin install forgetful-plugin@forgetful-plugins --scope user
  ```

  After install, verify by re-checking:

  ```bash
  if [ -f "$INSTALLED_FILE" ] && jq -e '.plugins["forgetful-plugin@forgetful-plugins"]' "$INSTALLED_FILE" >/dev/null 2>&1; then
    FP_VERSION=$(jq -r '.plugins["forgetful-plugin@forgetful-plugins"][0].version' "$INSTALLED_FILE")
    echo "forgetful-plugin: installed (v${FP_VERSION})"
  else
    echo "forgetful-plugin: installation could not be verified"
  fi
  ```

  If verification fails, report the error and suggest the user check `claude plugin list` for details.

### 4. Apply GSD patches

Only run if GSD is installed (step 2 resulted in `PASS`). If GSD is not installed, skip this step and note that patches require GSD.

```bash
bash "$PLUGIN_ROOT/patches/apply-all.sh"
```

Patches are idempotent -- they check for `TB_PATCH:` markers before applying and skip if already present. Safe to run on every bootstrap invocation.

### 5. Summary

Report final status of all three components:

- **GSD:** installed (v{X.Y.Z}) or not installed
- **forgetful-plugin:** installed (v{X.Y.Z}) or not installed
- **GSD patches:** {N} applied/confirmed, {M} errors (from apply-all.sh output) or skipped (GSD not installed)

If all components are healthy, report: "Bootstrap complete -- all components ready."

If any component failed, list what needs attention and suggest running `/tb:doctor` for a full health check.
