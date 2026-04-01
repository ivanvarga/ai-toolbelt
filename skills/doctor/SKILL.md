---
name: doctor
description: Check health of all tb plugin components
disable-model-invocation: true
---

# Doctor

Run all health checks for the tb plugin and report pass/fail/warn status.

## Steps

1. Resolve the plugin root directory:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
```

2. Discover and run all check scripts:

```bash
for script in "${PLUGIN_ROOT}/scripts/checks/"*.sh; do
  bash "$script" "${PLUGIN_ROOT}"
done
```

3. Each script outputs one line: `PASS|FAIL|WARN <check-name> <message>`

4. Group results by category and display as a checklist:

```
## Setup
- [check-name] result

## Credentials
- [check-name] result

## Tools
- [check-name] result
```

**Category mapping:**
- **Setup:** plugin-registered, global-config, git-identity, skills-valid, hooks-valid
- **Credentials:** cred-acli, cred-contentful, cred-github, cred-jira-token, cred-sentry
- **Tools:** tool-mbridge
- **Integration:** gsd-installed, forgetful-mcp, forgetful-plugin

**Display rules:**
- PASS: checkmark with message
- FAIL: cross with message and the fix hint
- WARN: warning symbol with message (not counted as failure)

5. Summarize: `N passed, M failed, W warnings`

6. Do NOT auto-fix anything -- just report results.

## Notes

Additional checks can be added by dropping `.sh` scripts into `scripts/checks/`. Each script must:
- Accept `$1` as the plugin root path
- Output one line: `PASS|FAIL|WARN <check-name> <message>`
- Always exit 0 (pass/fail is communicated via output, not exit code)

Unknown check names go into a "Other" category.
