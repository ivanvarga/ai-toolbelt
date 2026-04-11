# Phase 23: Adopt playwright-cli and visualize-changes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 23-adopt-playwright-cli-and-visualize-changes-into-tb-plugin
**Areas discussed:** Naming convention, Improvement scope, Coexistence strategy, File organization

---

## Naming Convention

### playwright-cli name

| Option | Description | Selected |
|--------|-------------|----------|
| tb:playwright-cli | Keeps original name, matches npm binary | |
| tb:playwright | Shorter, drops -cli suffix | |
| tb:browser | Generic capability name | ✓ |

**User's choice:** tb:browser
**Notes:** None

### visualize-changes name

| Option | Description | Selected |
|--------|-------------|----------|
| tb:visualize-changes | Keeps original name, follows family-action pattern | |
| tb:change-map | Shorter, matches skill output concept | ✓ |
| tb:diff-viz | Very short, less descriptive | |

**User's choice:** tb:change-map
**Notes:** None

---

## Improvement Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — rename only | Copy as-is, only change frontmatter name and path refs | |
| Light polish | Rename + fix paths + minor quality improvements | ✓ |
| Full rework | Rewrite both skills to match tb conventions deeply | |

**User's choice:** Light polish
**Notes:** "more on visualize changes has more issues, should be improved with skill creator"

### Follow-up: skill-creator timing

| Option | Description | Selected |
|--------|-------------|----------|
| Within this phase | Adopt + improve in one pass | ✓ |
| Adopt now, improve later | Copy first, skill-creator pass later | |

**User's choice:** Within this phase
**Notes:** None

---

## Coexistence Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Remove originals | Delete ~/.claude/skills/ originals after tb versions confirmed | ✓ |
| Keep both | Leave originals, both versions coexist | |
| Symlink to tb | Replace originals with symlinks to tb plugin | |

**User's choice:** Remove originals
**Notes:** None

### Follow-up: cleanup method

| Option | Description | Selected |
|--------|-------------|----------|
| Manual cleanup | Docs note rm commands, user runs after verification | ✓ |
| Automated via install.sh | install.sh detects and removes originals | |

**User's choice:** Manual cleanup
**Notes:** None

---

## File Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in skill dir | references/ and scripts/ stay inside skill directory | ✓ |
| Move scripts to top-level | Scripts to top-level scripts/, references stay | |
| Everything top-level | Both references and scripts to top-level dirs | |

**User's choice:** Keep in skill dir
**Notes:** None

---

## Claude's Discretion

- Exact wording of polished descriptions
- Specific issues to fix in tb:change-map during skill-creator pass
- Order of operations (browser first vs change-map first)

## Deferred Ideas

None — discussion stayed within phase scope
