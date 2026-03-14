---
name: pr-qa
description: Use when writing or updating PR descriptions that need QA testing instructions, or when the user asks to add QA steps to a pull request
---

# QA Description for Pull Requests

Generate concise, actionable QA instructions for PRs. The goal: QA can test in under 5 minutes without asking dev questions.

## Steps

1. **Identify affected screens** -- read the diff, find which screens/components changed
2. **Find navigation shortcuts** -- research deeplinks or URLs so QA can jump directly to affected screens
3. **Find admin/CMS links** -- if changes involve CMS-managed content, provide direct edit links (Contentful entry URLs, admin panels, etc.)
4. **Describe what to verify** -- bullet list of expected behaviors, not implementation details
5. **Add to PR description** -- use `gh pr edit` to update the body

## Output Format

Keep it short. QA knows the app and the CMS. Don't over-explain.

```markdown
## QA Steps

**CMS:** [Field Name](https://direct-link-to-edit) -- brief explanation of what to set/change.

**Screens to test:**

| Screen | Deeplink | What to verify |
|--------|----------|---------------|
| Screen Name | `scheme://path` | Expected behavior |

**Quick test:** One sentence describing the fastest way to see the change.

**Verify:**
- Bullet per acceptance criterion
- Focus on user-visible behavior
```

## Principles

- **Deeplinks over tap instructions** -- QA shouldn't need 5 taps to reach the screen
- **Direct CMS links** -- link to the exact entry/field, not "go to Contentful and find..."
- **Real IDs** -- use actual content IDs from the environment, not placeholders
- **One table** -- screens + deeplinks + what to check, all in one scannable view
- **No implementation details** -- "image shows" not "hook returns CMS URL"

## Finding Data

- **Deeplinks:** Check `.mbridge/deeplinks.md` cache first. If not available, research via codebase (app.config.ts, linking config, route definitions).
- **CMS entry URLs:** Export entries via CLI, construct URL: `https://app.contentful.com/spaces/{spaceId}/environments/{envId}/entries/{entryId}`
- **Content IDs:** Export a few entries of the relevant content type to get real `sys.id` values for deeplinks

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Placeholder deeplinks like `scheme://screen/:id` | Use real IDs from the environment |
| "Go to Contentful and find App Settings" | Provide direct link to the entry |
| Long paragraphs explaining the feature | Table + bullets, keep it scannable |
| Implementation-focused language | Write for QA: what they see, not how code works |
| Missing environment context | Specify which env/build the links target |
