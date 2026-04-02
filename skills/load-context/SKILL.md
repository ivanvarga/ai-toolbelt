---
name: load-context
description: Query and browse Forgetful memories for project context
---

# Load Context

Retrieve and browse Forgetful memories for the current project. Supports conversational refinement -- query, filter, expand, and selectively load memories into the conversation.

## Steps

### 1. Resolve project scope

```bash
REPO_ID=$(git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git$/\1/' | sed 's/.*[:/]\([^/]*\/[^/]*\)$/\1/')
echo "$REPO_ID"
```

If the command fails (not a git repo), warn the user that project scoping is unavailable and queries will be global. Continue without project scoping.

If the command succeeds, resolve the Forgetful project ID:

```
execute_forgetful_tool("list_projects", {"repo_name": "<REPO_ID>"})
```

Extract the project ID from the response. If no project is found, warn the user and continue without project scoping.

### 2. Parse user query

`$ARGUMENTS` contains the user's input. Parse it as follows:

- `--project <name>`: Override the auto-detected project. Re-run `list_projects` with this name.
- `--phase <number>`: Add phase scoping. Prepend "phase {N}" to the query text.
- `--tags <comma-separated>`: Note the tags for post-retrieval filtering.
- Everything not a flag is the **query text**.

If `$ARGUMENTS` is empty (no query provided), ask the user what topic they want to search for. Wait for their response before proceeding.

### 3. Execute semantic query

Call the Forgetful MCP tool:

```
execute_forgetful_tool("query_memory", {
  "query": "<query text, with 'phase {N}' prepended if --phase was given>",
  "k": 15,
  "importance_threshold": 7,
  "project_ids": ["<resolved project ID, omit this field entirely if no project found>"],
  "include_links": true,
  "max_links_per_primary": 2
})
```

If the Forgetful call fails, inform the user that Forgetful is unreachable and suggest running `/tb:doctor` to diagnose connectivity. Stop.

### 4. Display filtered results

From the returned results, apply these filters:

1. Keep only memories with importance >= 7
2. If `--tags` was provided, keep only memories whose tags include at least one of the specified tags
3. Cap at 8 results

Display each memory as a numbered block:

```
### 1. {title}
**Importance:** {score} | **Tags:** {tags, comma-separated}
{content snippet, first 300 characters}...
```

After the list, show a count line:

```
Showing {N} of {total fetched} results (filtered to importance >= 7)
```

If zero results remain after filtering, report: "No high-importance memories found for this query." and offer to try a broader search with a different query.

### 5. Conversational refinement

After displaying results, present three actions:

```
**What would you like to do?**
1. **Refine query** -- adjust search terms and re-run
2. **Expand a memory** -- view full content, linked memories, and metadata (enter number)
3. **Load into context** -- select memories to use in this conversation (e.g., "load 1,3,5")
```

**Refine query:** Ask the user for new search terms. Go back to Step 3 with the new query, preserving any `--project` or `--phase` flags from the original invocation.

**Expand a memory:** The user provides a memory number from the displayed list. Call `execute_forgetful_tool("query_memory", ...)` with the memory's title as the query and `k: 1` to retrieve its full content. Display:

- Full content (not truncated)
- Linked memories (titles and importance scores from the `include_links` response)
- Tags, keywords, creation date, last updated

After expansion, re-present the three action options so the user can continue exploring.

**Load into context:** The user specifies which memories by number (e.g., "1,3,5" or "all"). For each selected memory, output its full content in a structured block:

```xml
<loaded_memory source="forgetful" id="{memory_id}">
**{title}** (importance: {score})
{full content}
</loaded_memory>
```

After loading, confirm: "Loaded {N} memories into context. These will be available for the rest of this conversation."

## Graceful Degradation

If any Forgetful MCP call fails at any point during the workflow, report the error clearly and suggest running `/tb:doctor` to diagnose Forgetful connectivity.
