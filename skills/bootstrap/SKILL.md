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

### 5. Verify UserPromptSubmit hook

The UserPromptSubmit hook auto-injects Forgetful memories into every prompt. Due to bug #12151, plugin hooks.json output may be silently discarded. This step checks if fallback registration in settings.json is needed.

First, check if the hook is already registered in settings.json:

```bash
SETTINGS_JSON="$HOME/.claude/settings.json"
if [ -f "$SETTINGS_JSON" ] && python3 -c "import json; d=json.load(open('$SETTINGS_JSON')); assert 'UserPromptSubmit' in d.get('hooks', {})" 2>/dev/null; then
  echo "UserPromptSubmit: already registered in settings.json (fallback mode active)"
else
  echo "UserPromptSubmit: using plugin hooks.json registration (primary mode)"
  echo "If Forgetful context is not appearing in prompts, run the fallback registration below."
fi
```

- If already in settings.json: report "UserPromptSubmit: fallback mode active" and continue to step 6.
- If NOT in settings.json (primary mode): the hook is registered via plugin hooks.json. To verify it works, ask Claude "what Forgetful context was injected?" after your next prompt. If nothing appears, run `/tb:doctor` to confirm Forgetful is reachable, then run the fallback registration command below:

  ```bash
  PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
  ABSOLUTE_HOOK="$(cd "$PLUGIN_ROOT" && pwd)/hooks/user-prompt-context.js"
  SETTINGS_JSON="$HOME/.claude/settings.json"

  if [ ! -f "$SETTINGS_JSON" ]; then
    echo '{}' > "$SETTINGS_JSON"
  fi

  python3 -c "
  import json
  with open('$SETTINGS_JSON') as f:
      settings = json.load(f)
  hooks = settings.setdefault('hooks', {})
  hooks['UserPromptSubmit'] = [{'hooks': [{'type': 'command', 'command': 'node $ABSOLUTE_HOOK', 'timeout': 10}]}]
  with open('$SETTINGS_JSON', 'w') as f:
      json.dump(settings, f, indent=2)
  "
  echo "UserPromptSubmit: registered in settings.json as fallback"
  ```

  After running the fallback registration, verify:

  ```bash
  python3 -c "import json; d=json.load(open('$SETTINGS_JSON')); assert 'UserPromptSubmit' in d.get('hooks', {}); print('Verified: UserPromptSubmit in settings.json')" 2>/dev/null || echo "ERROR: Registration failed"
  ```

### 6. Summary

Report final status of all four components:

- **GSD:** installed (v{X.Y.Z}) or not installed
- **forgetful-plugin:** installed (v{X.Y.Z}) or not installed
- **GSD patches:** {N} applied/confirmed, {M} errors (from apply-all.sh output) or skipped (GSD not installed)
- **UserPromptSubmit hook:** primary mode (hooks.json) or fallback mode (settings.json) or not verified

If all components are healthy, report: "Bootstrap complete -- all components ready."

If any component failed, list what needs attention and suggest running `/tb:doctor` for a full health check.
