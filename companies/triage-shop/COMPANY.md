---
schema: agentcompanies/v1
kind: company
slug: triage-shop
name: Triage Shop
description: GitHub/Jira triage pipeline with oneshot and GSD-autonomous routing
version: 0.1.0
license: MIT
authors:
  - name: ai-toolbelt
goals:
  - Triage inbound issues assigned to the operator
  - Route confident work to oneshot or GSD-autonomous agents in isolated worktrees
  - Gate on human approval via Paperclip executionPolicy before shipping
requirements:
  secrets:
    - ANTHROPIC_API_KEY
    - GH_TOKEN
---

# Triage Shop

A small agent company that triages GitHub issues and Jira tickets assigned to the operator,
classifies confidence on 3 axes (understanding / solution / code-trace), and routes
to one of two downstream executors:

1. **oneshot-coder** — single-heartbeat fixes in an isolated worktree (D-13, D-17).
2. **gsd-orchestrator** — multi-step autonomous GSD workflow for larger scopes.

Human approval via Paperclip `executionPolicy` gates every transition to `done` (D-11, D-16).
Rejection with feedback re-queues the same task for the same executor (D-18).

## Agents

- `agents/triage/` — classifier, routes based on confidence labels + tag override
- `agents/oneshot-coder/` — single-fix executor
- `agents/gsd-orchestrator/` — GSD autonomous executor

## Dispatch contract

The tb webhook relay (scripts/tb-triage/relay.js) fires the `intake-github` or
`intake-jira` routine with the raw webhook payload plus canonical dedup key
(`gh:{owner}/{repo}#{number}` or `jira:{KEY}`). Paperclip creates an issue
assigned to the triage agent.

Telemetry: each run appends a decision record to `<worktree>/.tb-triage/decision.json`
for post-hoc audit; live telemetry lives in Paperclip's activity log (D-21).
