#!/usr/bin/env python3
import json
import os
import shlex
import sys


def passthrough():
    print("{}")
    sys.exit(0)


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        passthrough()

    if data.get("tool_name") != "Bash":
        passthrough()

    cmd = (data.get("tool_input") or {}).get("command") or ""
    cmd = cmd.strip()
    if not cmd:
        passthrough()

    if any(tok in cmd for tok in [";", "&&", "||", "|", "`", "$(", "\n"]):
        passthrough()

    try:
        tokens = shlex.split(cmd)
    except ValueError:
        passthrough()

    if not tokens or tokens[0] != "rm":
        passthrough()

    targets = []
    i = 1
    while i < len(tokens):
        tok = tokens[i]
        if tok == "--":
            targets.extend(tokens[i + 1:])
            break
        if tok.startswith("-"):
            i += 1
            continue
        targets.append(tok)
        i += 1

    if not targets:
        passthrough()

    cwd = os.path.realpath(os.getcwd())
    protected_names = {".git"}
    protected_prefixes = (".env",)

    for target in targets:
        expanded = os.path.expanduser(target)
        if not os.path.isabs(expanded):
            expanded = os.path.join(cwd, expanded)
        resolved = os.path.realpath(expanded)

        if resolved == cwd or not resolved.startswith(cwd + os.sep):
            passthrough()

        rel = os.path.relpath(resolved, cwd)
        for part in rel.split(os.sep):
            if part in protected_names:
                passthrough()
            if any(part.startswith(p) for p in protected_prefixes):
                passthrough()

    result = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": "rm targets within cwd, not .git/.env (git-recoverable)",
        }
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
