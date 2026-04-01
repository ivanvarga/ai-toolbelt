# Phase 19: GSD Workflow Patches - Research

**Researched:** 2026-04-01
**Domain:** Sed/awk-based patching of GSD workflow markdown files + Node.js helper scripts for Forgetful memory queries
**Confidence:** HIGH

## Summary

Phase 19 delivers patch scripts that modify 6 GSD workflow `.md` files to inject Forgetful memory queries at specific decision points, plus helper scripts that encapsulate the query logic. The patched workflows call helper scripts (in `scripts/gsd-*-context.js`) which use the `forgetful-client.js` module from Phase 18 to query Forgetful via MCP Streamable HTTP.

The patch mechanism uses sed-based insertion scripts stored in `patches/` that target stable structural markers (`<step name="...">`, `## N. Step Name`, `<process>`) in GSD workflow files. Patches are designed to be re-appliable: GSD's built-in `gsd-local-patches/` + `/gsd:reapply-patches` mechanism backs up modified files before updates and offers to merge them back.

**Primary recommendation:** Build helper scripts first (they contain all logic), then create thin patch scripts that insert single-line `node` calls at verified insertion points in each workflow. Each patch should be independently appliable and idempotent.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Direct file edits to GSD workflow `.md` files. Sed/awk-based patch scripts stored in a new top-level `patches/` directory in the tb repo.
- **D-02:** Each patched workflow calls a dedicated helper script (e.g., `scripts/gsd-discuss-context.js`) that uses `forgetful-client.js` internally. Workflow patches are minimal insertions; logic lives in scripts.
- **D-03:** new-project/new-milestone (GPATCH-01): Broad query scoped by project domain. Let Forgetful's cross-encoder ranking decide relevance. No pre-filtering by category.
- **D-04:** discuss-phase (GPATCH-02): Query by phase domain -- extract phase goal/name, query for similar decisions across all projects. Claude's discretion on exact query construction.
- **D-05:** plan-phase (GPATCH-03): Query for previous similar feature implementations AND relevant stack/technology information. Planner gets both "how we built this before" and "what tech constraints apply."
- **D-06:** No token budget for injected context. Trust Forgetful's cross-encoder ranking for relevance filtering.
- **D-07:** On milestone completion (GPATCH-04), extract Lessons Learned and Key Outcomes from SUMMARY.md only. Not full PROJECT.md decisions or individual phase contexts.
- **D-08:** Show extracted memories and require user confirmation before saving to Forgetful. Display each, allow approve/edit/skip per memory.
- **D-09:** Auto-mark previously saved memories about the same project/milestone as obsolete before saving new ones. Query Forgetful for existing, mark obsolete, then save fresh.
- **D-10:** Leverage GSD's built-in `gsd-local-patches/` + `/gsd:reapply-patches` mechanism. tb patches are designed to be re-appliable through this existing infrastructure.
- **D-11:** If reapply fails (workflow structure changed), warn user via doctor check and suggest running `/tb:bootstrap` to re-apply from tb's `patches/` directory. No silent auto-recovery.
- **D-12:** research-phase (GPATCH-06): Query Forgetful for prior research on similar topics/domains across all projects.
- **D-13:** Context injected into researcher agent prompts by the patched workflow (pre-fetched). Agents do NOT query Forgetful directly.
- **D-14:** Both project-level researchers (gsd-project-researcher, 4x parallel in new-project) and phase-level researchers (gsd-phase-researcher) receive Forgetful context.

### Claude's Discretion
- Exact query construction for each workflow injection point (query strings, context parameters)
- Internal structure of helper scripts (function signatures, error handling)
- Sed/awk marker patterns for stable patch insertion points
- Graceful failure behavior when Forgetful is unreachable (should fail silently, never block workflows)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GPATCH-01 | GSD new-project and new-milestone workflows query Forgetful for prior project patterns during context gathering | Injection points identified in new-project.md Step 6 (before researcher spawning) and new-milestone.md Step 8 (before researcher spawning). Helper: `scripts/gsd-project-context.js` |
| GPATCH-02 | GSD discuss-phase workflow loads similar decisions from Forgetful before presenting gray areas | Injection point: discuss-phase.md `<step name="load_prior_context">` -- inject after project file reads, before building `<prior_decisions>`. Helper: `scripts/gsd-discuss-context.js` |
| GPATCH-03 | GSD plan-phase workflow injects relevant patterns/templates from Forgetful into planner context | Injection point: plan-phase.md Step 5 (Handle Research) -- inject Forgetful context into researcher spawn prompt's `<additional_context>`, and into planner spawn prompt in Step 8. Helper: `scripts/gsd-plan-context.js` |
| GPATCH-04 | GSD complete-milestone workflow auto-saves key decisions and findings to Forgetful | Injection point: complete-milestone.md after `<step name="write_retrospective">` -- new step that calls helper to extract and save. Helper: `scripts/gsd-milestone-save.js` |
| GPATCH-05 | Patches survive GSD updates via /gsd:reapply-patches or tb's own re-apply mechanism | GSD installer backs up modified files to `gsd-local-patches/` with `backup-meta.json`. `/gsd:reapply-patches` merges them back. Patch scripts in `patches/` allow re-application from tb's source. Doctor check verifies patches are applied. |
| GPATCH-06 | GSD research-phase and project-level researcher agents receive relevant Forgetful memories as prior research | Injection point: research-phase.md Step 4 (Spawn Researcher) -- inject into `<additional_context>` block. For new-project/new-milestone: inject into each of the 4 researcher Task prompts. Helper: reuse `scripts/gsd-plan-context.js` with phase/topic args |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (native fetch) | 24.x (system) | Helper scripts that query Forgetful via MCP HTTP | Already the pattern from Phase 18's forgetful-client.js. Native fetch available in Node 18+. |
| sed (BSD) | system | Workflow file patching -- insert lines at marker positions | Available on macOS, no dependencies. BSD sed requires `-i ''` (not `-i` like GNU). |
| forgetful-client.js | 0.1.0 (local) | MCP session lifecycle, tool dispatch, SSE parsing | Phase 18 deliverable. All helper scripts import this module. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bash | 3.2+ (system) | Patch application scripts in `patches/` | Each patch script is a bash wrapper calling sed with proper markers. |
| jq | 1.7.1 (system) | Parse JSON arguments passed to helper scripts | Already installed. Used for extracting phase info from gsd-tools output. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sed patches | git patch/diff files | Diffs are fragile across versions. Sed targeting structural markers (`<step name=`, `## N.`) survives minor upstream edits. |
| sed patches | Node.js AST-like parsing of .md | Over-engineering. The insertions are single-line bash commands. sed is sufficient. |
| Individual helper scripts per workflow | Single monolithic helper | Per-workflow scripts allow independent testing and keep concerns separated per D-02. |

## Architecture Patterns

### Recommended Project Structure
```
patches/
  apply-all.sh              # Master script: runs all patches in order
  patch-new-project.sh      # Patches new-project.md
  patch-new-milestone.sh    # Patches new-milestone.md
  patch-discuss-phase.sh    # Patches discuss-phase.md
  patch-plan-phase.sh       # Patches plan-phase.md
  patch-complete-milestone.sh  # Patches complete-milestone.md
  patch-research-phase.sh   # Patches research-phase.md
  verify-patches.sh         # Verifies all patches are applied

scripts/
  forgetful-client.js       # [EXISTS] Phase 18 MCP HTTP client
  gsd-project-context.js    # [NEW] Queries Forgetful for project patterns (GPATCH-01)
  gsd-discuss-context.js    # [NEW] Queries Forgetful for similar decisions (GPATCH-02)
  gsd-plan-context.js       # [NEW] Queries Forgetful for impl patterns + stack info (GPATCH-03, GPATCH-06)
  gsd-milestone-save.js     # [NEW] Extracts and saves memories from SUMMARY.md (GPATCH-04)
```

### Pattern 1: Sed Patch with Idempotency Guard

**What:** Each patch script checks if the patch is already applied before inserting. Uses a unique marker comment in the inserted content to detect prior application.

**When to use:** Every patch script.

**Example:**
```bash
#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/discuss-phase.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# TB_PATCH: forgetful-discuss-context"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP discuss-phase.md not found (GSD not installed)"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "SKIP discuss-phase.md already patched"
  exit 0
fi

# Insert after the line matching the target marker
sed -i '' "/^<step name=\"load_prior_context\">/a\\
\\
$MARKER\\
FORGETFUL_CONTEXT=\$(node \"$PLUGIN_ROOT/scripts/gsd-discuss-context.js\" \"\${PHASE}\" 2>/dev/null || true)\\
" "$WORKFLOW"

echo "OK discuss-phase.md patched"
```

### Pattern 2: Helper Script with Silent Failure

**What:** Each helper script queries Forgetful and outputs context as plain text. On any failure (Forgetful unreachable, no project found, timeout), it exits 0 with empty output. Never blocks the calling workflow.

**When to use:** All `scripts/gsd-*-context.js` helpers.

**Example:**
```javascript
#!/usr/bin/env node
const { resolveForgetfulUrl, createSession, callTool } = require('./forgetful-client');

async function main() {
  const url = resolveForgetfulUrl();
  if (!url) process.exit(0);

  try {
    const sessionId = await createSession(url);
    const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
      tool_name: 'query_memory',
      arguments: { query: process.argv[2] || '', k: 5 }
    });
    // Format and output
    const memories = result?.result?.structuredContent?.primary_memories || [];
    if (memories.length === 0) process.exit(0);
    // Output formatted context
    console.log(formatMemories(memories));
  } catch {
    process.exit(0);
  }
}
main();
```

### Pattern 3: Workflow Injection via Variable Capture

**What:** The patched workflow runs a helper script, captures its output in a bash variable, then includes that variable in the downstream agent prompt or context block.

**When to use:** GPATCH-01/02/03/06 where context is injected into agent prompts.

**How it works in the workflow .md file (after patching):**
```markdown
## 6. Research Decision

# TB_PATCH: forgetful-project-context
```bash
FORGETFUL_CONTEXT=$(node "$PLUGIN_ROOT/scripts/gsd-project-context.js" "$PROJECT_DOMAIN" 2>/dev/null || true)
`` `

**If "Research first":**
...
Task(prompt="
...
<forgetful_context>
${FORGETFUL_CONTEXT}
</forgetful_context>
...
")
```

### Pattern 4: Milestone Save with User Confirmation

**What:** The helper script for GPATCH-04 extracts memories from SUMMARY.md files, then the patched workflow presents each for user approval using AskUserQuestion.

**When to use:** GPATCH-04 only (milestone completion).

**Flow:**
1. Helper script extracts candidate memories as JSON
2. Patched workflow iterates candidates
3. For each: display content, ask approve/edit/skip
4. Approved memories saved via Forgetful MCP tools (Claude calls them directly, not the helper)
5. Obsoleted memories marked via `mark_memory_obsolete`

### Anti-Patterns to Avoid
- **Hardcoded absolute paths in patches:** Use `$PLUGIN_ROOT` derived from script location. The tb plugin cache path changes on updates.
- **Patching without idempotency:** Always check for marker comment before inserting. Running `apply-all.sh` twice must be safe.
- **Complex multi-line sed insertions:** Keep patches to 1-3 lines. Complex logic belongs in helper scripts, not in sed commands.
- **Helper scripts that block on failure:** Every helper must wrap its entire body in try/catch and exit 0 on any error.
- **Querying Forgetful without project scope:** Always use `list_projects` first to get project_id, then scope `query_memory` by project_ids. Unscoped queries return noise.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP HTTP client | Custom fetch wrapper | `scripts/forgetful-client.js` (Phase 18) | Session lifecycle, SSE parsing, error handling already solved |
| Patch backup/restore | Custom backup mechanism | GSD's `gsd-local-patches/` + `/gsd:reapply-patches` | Already handles file-level backup, conflict detection, merge |
| Memory dedup | Semantic similarity checking | Forgetful's `query_memory` + cross-encoder | Forgetful already does semantic search; query before create |
| Obsolescence marking | Manual record tracking | Forgetful's `mark_memory_obsolete` with `superseded_by` | Built-in audit trail in Forgetful |
| JSON-RPC construction | Manual string templates | `callTool()` from forgetful-client.js | Handles JSON-RPC 2.0 envelope, SSE parsing |

## Common Pitfalls

### Pitfall 1: BSD sed vs GNU sed
**What goes wrong:** Patches fail on macOS because BSD sed `-i` requires an explicit backup extension argument (`-i ''`), while GNU sed treats `-i` as in-place without argument.
**Why it happens:** Most sed examples online target GNU sed (Linux).
**How to avoid:** Always use `sed -i '' 'pattern' file` on macOS. Test patches on the actual target OS.
**Warning signs:** `sed: 1: "...": extra characters at the end of l command`

### Pitfall 2: Sed Special Characters in Insertion Text
**What goes wrong:** Sed `a\` (append) and `i\` (insert) commands choke on `$`, `/`, `"`, `\` in the inserted text because they have special meaning.
**Why it happens:** Helper script paths contain `$HOME`, `$PLUGIN_ROOT`, and quotes.
**How to avoid:** Use escaped variables in sed insertions. Or better: write the full command to a temp file and use `sed -i '' "/MARKER/r $TEMPFILE" "$WORKFLOW"` to read from file instead of inline text.
**Warning signs:** Truncated or garbled insertions in patched files.

### Pitfall 3: GSD Version Changes Structural Markers
**What goes wrong:** A GSD update changes `<step name="load_prior_context">` to `<step name="load-prior-context">` or renames a step entirely, and sed patches silently fail to match.
**Why it happens:** GSD is actively developed. Workflow structure is not a stable API.
**How to avoid:** Verify-patches.sh checks that each marker exists in the target file before patching. Doctor check warns if patches are not applied after an update.
**Warning signs:** `verify-patches.sh` reports missing markers. Forgetful context stops appearing in workflows.

### Pitfall 4: Helper Script Startup Latency
**What goes wrong:** Node.js startup (~100ms) + MCP handshake (~96ms) adds ~200ms per workflow step that calls a helper.
**Why it happens:** Each helper script runs as a fresh Node.js process with a new MCP session.
**How to avoid:** This is within the acceptable budget per the architecture research (target <200ms for GSD prompts). Only one helper runs per workflow step, not multiple. Do NOT try to optimize with session caching or child process pools -- the complexity is not warranted.
**Warning signs:** If total latency exceeds 500ms, check Forgetful server health.

### Pitfall 5: Empty FORGETFUL_CONTEXT in Workflow Variable
**What goes wrong:** The workflow template includes `${FORGETFUL_CONTEXT}` in a Task prompt but the variable is empty (Forgetful unreachable or no memories found), resulting in empty `<forgetful_context></forgetful_context>` tags.
**Why it happens:** Helper exits 0 with no output (correct behavior).
**How to avoid:** In the patched workflow, wrap the context injection in a conditional: only include the `<forgetful_context>` block if the variable is non-empty.
**Warning signs:** Agent prompts contain empty XML tags.

### Pitfall 6: Milestone Save Creates Duplicate Memories
**What goes wrong:** Running `/gsd:complete-milestone` twice saves the same SUMMARY.md content twice to Forgetful.
**Why it happens:** No check for existing memories about the same milestone.
**How to avoid:** D-09 mandates: query Forgetful for existing memories about the project/milestone, mark obsolete, then save fresh. The helper script must implement this query-before-create pattern.
**Warning signs:** Duplicate memories visible in `/memory-list`.

## Code Examples

### Helper Script: gsd-discuss-context.js (Pattern)
```javascript
#!/usr/bin/env node
const { resolveForgetfulUrl, createSession, callTool } = require('./forgetful-client');

async function main() {
  const phaseArg = process.argv[2];
  if (!phaseArg) process.exit(0);

  const url = resolveForgetfulUrl();
  if (!url) process.exit(0);

  try {
    const sessionId = await createSession(url);

    const repoName = require('child_process')
      .execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' })
      .trim()
      .replace(/.*[:/]([^/]+\/[^/]+?)(?:\.git)?$/, '$1');

    const projects = await callTool(url, sessionId, 'execute_forgetful_tool', {
      tool_name: 'list_projects',
      arguments: { repo_name: repoName }
    });

    const projectList = projects?.result?.structuredContent?.projects
      || JSON.parse(projects?.result?.content?.[0]?.text || '{}').projects
      || [];
    if (projectList.length === 0) process.exit(0);

    const projectId = projectList[0].id;

    const memories = await callTool(url, sessionId, 'execute_forgetful_tool', {
      tool_name: 'query_memory',
      arguments: {
        query: `decisions and patterns for phase: ${phaseArg}`,
        query_context: 'GSD discuss-phase: loading similar past decisions',
        k: 5,
        project_ids: [projectId],
        include_links: true,
        max_links_per_primary: 2
      }
    });

    const primaryMemories = memories?.result?.structuredContent?.primary_memories
      || JSON.parse(memories?.result?.content?.[0]?.text || '{}').primary_memories
      || [];

    if (primaryMemories.length === 0) process.exit(0);

    console.log(`\n<forgetful_prior_decisions>`);
    console.log(`Relevant memories from Forgetful (${primaryMemories.length} found):\n`);
    for (const mem of primaryMemories) {
      console.log(`- **${mem.title}** (importance: ${mem.importance}): ${mem.content?.substring(0, 300)}...`);
    }
    console.log(`</forgetful_prior_decisions>\n`);
  } catch {
    process.exit(0);
  }
}

main();
```

### Patch Script: patch-discuss-phase.sh (Pattern)
```bash
#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="$HOME/.claude/get-shit-done/workflows/discuss-phase.md"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# TB_PATCH: forgetful-discuss-context"

if [ ! -f "$WORKFLOW" ]; then
  echo "SKIP discuss-phase: workflow not found"
  exit 0
fi

if grep -q "$MARKER" "$WORKFLOW"; then
  echo "OK discuss-phase: already patched"
  exit 0
fi

# Create temp file with content to insert
TMPFILE=$(mktemp)
cat > "$TMPFILE" << 'PATCH_EOF'

# TB_PATCH: forgetful-discuss-context
```bash
FORGETFUL_CONTEXT=$(node "${PLUGIN_ROOT}/scripts/gsd-discuss-context.js" "${PHASE}" 2>/dev/null || true)
```

If FORGETFUL_CONTEXT is non-empty, include it in the prior_decisions context:
```
<forgetful_prior_decisions>
${FORGETFUL_CONTEXT}
</forgetful_prior_decisions>
```
PATCH_EOF

# Insert after the load_prior_context step marker
sed -i '' "/<step name=\"load_prior_context\">/r $TMPFILE" "$WORKFLOW"
rm "$TMPFILE"

echo "OK discuss-phase: patched"
```

### apply-all.sh (Master Script)
```bash
#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Applying GSD workflow patches..."

for patch in "$PATCH_DIR"/patch-*.sh; do
  [ -f "$patch" ] || continue
  bash "$patch"
done

echo ""
bash "$PATCH_DIR/verify-patches.sh"
```

### verify-patches.sh (Verification)
```bash
#!/usr/bin/env bash
WORKFLOW_DIR="$HOME/.claude/get-shit-done/workflows"
PASS=0; FAIL=0

check() {
  local file="$1" marker="$2" name="$3"
  if [ ! -f "$WORKFLOW_DIR/$file" ]; then
    echo "SKIP $name: $file not found"
    return
  fi
  if grep -q "$marker" "$WORKFLOW_DIR/$file"; then
    echo "PASS $name"
    ((PASS++))
  else
    echo "FAIL $name: patch not applied"
    ((FAIL++))
  fi
}

check "new-project.md" "TB_PATCH: forgetful-project-context" "new-project"
check "new-milestone.md" "TB_PATCH: forgetful-milestone-context" "new-milestone"
check "discuss-phase.md" "TB_PATCH: forgetful-discuss-context" "discuss-phase"
check "plan-phase.md" "TB_PATCH: forgetful-plan-context" "plan-phase"
check "complete-milestone.md" "TB_PATCH: forgetful-milestone-save" "complete-milestone"
check "research-phase.md" "TB_PATCH: forgetful-research-context" "research-phase"

echo ""
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
```

## GSD Workflow Injection Points (Verified)

Exact insertion points for each workflow, verified against GSD v1.30.0 workflow files.

### new-project.md (GPATCH-01)
**Target:** Step 6 "Research Decision", before spawning 4 parallel researchers
**Marker:** `## 6. Research Decision` (line ~567)
**What to insert:** Run `gsd-project-context.js` with project domain extracted from user questioning. Inject `${FORGETFUL_CONTEXT}` into each of the 4 researcher Task prompt `<milestone_context>` blocks.
**Insertion approach:** Insert bash block after the `## 6. Research Decision` header. Also modify the 4 Task() prompt templates to include a `<forgetful_context>` section.

### new-milestone.md (GPATCH-01)
**Target:** Step 8 "Research Decision", before spawning 4 parallel researchers
**Marker:** `## 8. Research Decision` (line ~176)
**What to insert:** Same pattern as new-project -- run helper, inject into researcher prompts.

### discuss-phase.md (GPATCH-02)
**Target:** Step "load_prior_context", after project-level file reads
**Marker:** `<step name="load_prior_context">` (line ~204)
**What to insert:** Run `gsd-discuss-context.js` with phase number. Inject result into `<prior_decisions>` context alongside the file-based prior decisions.

### plan-phase.md (GPATCH-03, GPATCH-06)
**Target 1:** Step 5 "Handle Research", in the researcher spawn prompt
**Marker:** `## 5. Handle Research` (line ~235)
**What to insert:** Run `gsd-plan-context.js` with phase info. Inject into researcher's `<additional_context>` and planner's prompt in Step 8.

**Target 2:** Step 8 "Spawn gsd-planner Agent"
**Marker:** `## 8. Spawn gsd-planner Agent` (line ~463)
**What to insert:** Include `${FORGETFUL_CONTEXT}` in the planner's Task prompt.

### research-phase.md (GPATCH-06)
**Target:** Step 4 "Spawn Researcher", in the researcher spawn prompt
**Marker:** The `Task(` call in Step 4 (line ~52)
**What to insert:** Run `gsd-plan-context.js` with phase/topic args. Inject `<forgetful_context>` into the researcher's prompt `<additional_context>` section.

### complete-milestone.md (GPATCH-04)
**Target:** After step "write_retrospective" (the last substantive step before branches/tags)
**Marker:** End of `<step name="write_retrospective">` block, `</step>` (line ~503)
**What to insert:** New `<step name="save_to_forgetful">` block that runs `gsd-milestone-save.js` to extract memories, then presents each for user confirmation.

## GSD Local Patches Mechanism (GPATCH-05)

### How It Works
1. GSD's `npx get-shit-done-cc@latest` installer computes checksums of installed workflow/command/agent files
2. On update, it compares current files against expected checksums
3. Modified files are backed up to `~/.claude/gsd-local-patches/` with a `backup-meta.json` manifest
4. After update, the update workflow prompts: "Run /gsd:reapply-patches to merge your modifications"
5. `/gsd:reapply-patches` reads both backed-up and new versions, uses AI-assisted merge to reapply modifications

### tb's Patch Survival Strategy
1. **Primary path:** GSD update detects modified workflows, backs them up, user runs `/gsd:reapply-patches`, AI merges patches back
2. **Fallback path:** If reapply fails (structural changes too large), user runs `/tb:bootstrap` which calls `patches/apply-all.sh` to re-apply from source
3. **Detection:** Doctor check (`verify-patches.sh`) reports which patches are missing after an update, suggesting the fix command

### Patch Design for Survivability
- Each patch inserts a clearly delimited block with a `TB_PATCH:` marker comment
- Blocks are small (3-5 lines of workflow text) to minimize merge conflicts
- The actual logic lives in helper scripts (not inline in the workflow), so patches only need to insert call sites
- If a workflow's structure changes, the marker-based sed may fail silently -- verify-patches.sh catches this

## Forgetful Query Patterns per Workflow

| Workflow | Query Strategy | query_context | k | Notes |
|----------|---------------|---------------|---|-------|
| new-project | `"{project domain} patterns and architecture"` | `"GSD new-project: prior project patterns"` | 5 | Broad, cross-project. Domain from user questioning. |
| new-milestone | `"{milestone features} implementation patterns"` | `"GSD new-milestone: prior milestone patterns"` | 5 | Same as new-project but scoped to target features. |
| discuss-phase | `"decisions for {phase goal/name}"` | `"GSD discuss-phase: similar past decisions"` | 5 | Phase-specific. Extracts phase name from ROADMAP. |
| plan-phase | `"{phase name} implementation AND {technology}"` | `"GSD plan-phase: implementation patterns and stack"` | 5 | Two queries: one for impl patterns, one for tech stack. May use 2 `query_memory` calls. |
| research-phase | `"research on {phase domain/topic}"` | `"GSD research-phase: prior research findings"` | 5 | Topic extracted from phase description. |
| complete-milestone | N/A (saves, doesn't query) | N/A | N/A | Extracts from SUMMARY.md, saves to Forgetful. |

## Milestone Save Memory Extraction (GPATCH-04)

### What Gets Extracted from SUMMARY.md
Per D-07, only from SUMMARY.md files (not PROJECT.md or phase CONTEXT.md):

1. **Key Outcomes / Accomplishments** section -- each becomes a memory with tag "milestone-outcome"
2. **Lessons Learned / Key Lessons** section (from RETROSPECTIVE.md) -- each becomes a memory with tag "lesson-learned"
3. **Patterns Established** (from SUMMARY frontmatter) -- each becomes a memory with tag "pattern"
4. **Key Decisions** (from SUMMARY frontmatter) -- each becomes a memory with tag "decision"

### Memory Creation Parameters
```javascript
{
  title: "[Milestone vX.Y] {extracted title}",
  content: "{extracted content, 100-400 words}",
  importance: 7,  // 7 for outcomes, 8 for lessons, 7 for patterns
  tags: ["milestone-outcome", "v{version}"],
  project_ids: [projectId]
}
```

### Obsolescence Flow (D-09)
1. Query Forgetful: `query_memory({ query: "milestone vX.Y {project}", project_ids: [pid] })`
2. For each existing memory about this milestone: `mark_memory_obsolete({ memory_id: id, reason: "Superseded by fresh milestone save" })`
3. Then create new memories

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hook-based context injection (UserPromptSubmit) | Direct workflow patching | Phase 19 design decision | Patches are more surgical -- only inject at the exact workflow step where context is needed, not on every prompt |
| Inline MCP calls in bash | Helper scripts importing forgetful-client.js | Phase 18 | Clean separation: patches are thin call sites, scripts contain logic |
| Manual patch reapplication | GSD's gsd-local-patches + reapply-patches | GSD v1.x | Built-in mechanism handles backup/restore; tb just needs to be compatible |

## Open Questions

1. **Exact PLUGIN_ROOT resolution in patched workflows**
   - What we know: Patches insert bash commands that reference helper scripts. These need the tb plugin's path.
   - What's unclear: How to resolve `PLUGIN_ROOT` from within a GSD workflow context. The workflow doesn't know about tb's plugin path.
   - Recommendation: Use the approach from ARCHITECTURE.md -- resolve from `~/.claude/plugins/installed_plugins.json` via `jq`, or hardcode to a well-known path like `~/.claude/plugins/*/ai-toolbelt/scripts/`. Alternatively, the patch scripts can embed the absolute path at patch-apply time (resolved once by `apply-all.sh`).

2. **plan-phase has two injection points (researcher + planner)**
   - What we know: Forgetful context should reach both the researcher and the planner.
   - What's unclear: Whether to run the helper once and share the variable, or run it twice with different queries.
   - Recommendation: Run once at Step 5, store in `FORGETFUL_CONTEXT`, reuse in both Step 5 (researcher) and Step 8 (planner). Single query, two consumers.

3. **complete-milestone save requires Claude's MCP tools, not direct HTTP**
   - What we know: The helper script can extract candidate memories, but actually saving them requires `execute_forgetful_tool("create_memory", ...)` which is a Claude MCP tool call.
   - What's unclear: Whether the save should happen entirely in the helper script (via direct HTTP) or in the workflow (via Claude MCP tools).
   - Recommendation: Helper extracts and outputs JSON candidates. The patched workflow has Claude call `execute_forgetful_tool` for each approved memory. This leverages Claude's MCP connection and allows the interactive approve/edit/skip flow per D-08.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Helper scripts | Yes | 24.12.0 | -- |
| sed (BSD) | Patch scripts | Yes | system | -- |
| jq | JSON parsing in patches | Yes | 1.7.1 | -- |
| bash | Patch scripts | Yes | 3.2.57 | -- |
| GSD workflows | Patch targets | Yes | 1.30.0 | Skip patching if not installed |
| Forgetful MCP | Runtime queries | Yes (WARN if unreachable) | 3.1.1 | Silent failure -- no context injected |
| forgetful-client.js | Helper scripts | Yes | Phase 18 | -- |
| git | Repo detection in helpers | Yes | system | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Forgetful MCP server unreachable at runtime: helpers exit 0 silently, workflows proceed without context.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bash + verify-patches.sh |
| Config file | none -- verify script is the test |
| Quick run command | `bash patches/verify-patches.sh` |
| Full suite command | `bash patches/apply-all.sh && bash patches/verify-patches.sh` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GPATCH-01 | new-project + new-milestone have Forgetful context | smoke | `grep -q "TB_PATCH: forgetful-project-context" ~/.claude/get-shit-done/workflows/new-project.md && grep -q "TB_PATCH: forgetful-milestone-context" ~/.claude/get-shit-done/workflows/new-milestone.md` | Wave 0 |
| GPATCH-02 | discuss-phase has Forgetful context | smoke | `grep -q "TB_PATCH: forgetful-discuss-context" ~/.claude/get-shit-done/workflows/discuss-phase.md` | Wave 0 |
| GPATCH-03 | plan-phase has Forgetful context | smoke | `grep -q "TB_PATCH: forgetful-plan-context" ~/.claude/get-shit-done/workflows/plan-phase.md` | Wave 0 |
| GPATCH-04 | complete-milestone has save step | smoke | `grep -q "TB_PATCH: forgetful-milestone-save" ~/.claude/get-shit-done/workflows/complete-milestone.md` | Wave 0 |
| GPATCH-05 | Patches are re-appliable | integration | `bash patches/apply-all.sh` (idempotent) | Wave 0 |
| GPATCH-06 | research-phase has Forgetful context | smoke | `grep -q "TB_PATCH: forgetful-research-context" ~/.claude/get-shit-done/workflows/research-phase.md` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bash patches/verify-patches.sh`
- **Per wave merge:** `bash patches/apply-all.sh && bash patches/verify-patches.sh`
- **Phase gate:** All 6 patches verified + helper scripts return valid output against live Forgetful

### Wave 0 Gaps
- [ ] `patches/verify-patches.sh` -- covers all GPATCH requirements
- [ ] `patches/apply-all.sh` -- master application script

## Sources

### Primary (HIGH confidence)
- GSD v1.30.0 workflow files (read directly from `~/.claude/get-shit-done/workflows/`) -- structural markers, step names, agent spawn patterns
- `/gsd:reapply-patches` command definition (`~/.claude/commands/gsd/reapply-patches.md`) -- patch backup/restore mechanism
- GSD update workflow (`~/.claude/get-shit-done/workflows/update.md`) -- gsd-local-patches backup flow
- `scripts/forgetful-client.js` (Phase 18) -- MCP client API surface
- `.planning/research/ARCHITECTURE.md` -- component responsibilities, anti-patterns, data flow
- `.planning/research/STACK.md` -- MCP protocol flow, required headers, tool dispatcher pattern
- `.planning/research/FEATURES.md` -- anti-features, dependency graph, MVP definition

### Secondary (MEDIUM confidence)
- Forgetful `execute_forgetful_tool` dispatcher pattern -- verified against live server but API may evolve
- GSD installer checksum-based modification detection -- inferred from update workflow behavior, not from source code inspection

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already available and verified
- Architecture: HIGH -- injection points verified against actual workflow files
- Pitfalls: HIGH -- sed patterns tested conceptually, GSD update mechanism documented
- Patch mechanism: MEDIUM -- gsd-local-patches behavior inferred from workflow docs, not installer source

**Research date:** 2026-04-01
**Valid until:** 2026-04-15 (GSD updates may change workflow structure; re-verify markers before implementation)
