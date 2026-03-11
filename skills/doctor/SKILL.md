---
name: doctor
description: Check health of all tb plugin components
disable-model-invocation: true
---

# Doctor

Run all health checks for the tb plugin and report pass/fail status.

## Steps

1. Resolve the plugin root directory:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
```

2. Discover all check scripts:

```bash
ls "${PLUGIN_ROOT}/scripts/checks/"*.sh
```

3. Run each check script, passing the plugin root as the first argument:

```bash
bash "${PLUGIN_ROOT}/scripts/checks/<script>.sh" "${PLUGIN_ROOT}"
```

4. Each script outputs a single line in the format: `PASS|FAIL <check-name> <message>`

5. Display results as a checklist. For each result:
   - PASS: show a checkmark with the check name and message
   - FAIL: show a cross with the check name, message, and the fix hint

6. Summarize at the end: `N/M checks passed`

7. Do NOT auto-fix anything -- just report results.

## Notes

Additional checks can be added by dropping `.sh` scripts into `scripts/checks/`. Each script must:
- Accept `$1` as the plugin root path
- Output one line: `PASS|FAIL <check-name> <message>`
- Always exit 0 (pass/fail is communicated via output, not exit code)
