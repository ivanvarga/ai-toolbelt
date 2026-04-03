---
name: tb:release-create
description: Use when creating a new app release branch, preparing a release, or bumping app version. Handles version bumps across package.json, app.config.ts, CHANGELOG.md, git commit, push, and PR creation.
disable-model-invocation: true
---

# Create Release Branch

Creates a release branch by examining the last release PR's full diff and replicating the pattern with new version values. Missing any file causes build/submission failures.

## Files to Update

| File | Fields | Format |
|------|--------|--------|
| `package.json` | `version` | `"X.Y.Z"` |
| `app.config.ts` | `runtimeVersion` | `"X.Y.Z"` |
| `app.config.ts` | `version` | `"X.Y.Z"` |
| `app.config.ts` | `buildNumber` (iOS) | String, increment by 1 (e.g., `"876"` -> `"877"`) |
| `app.config.ts` | `versionCode` (Android) | Number, increment by 1 (e.g., `876` -> `877`) |
| `CHANGELOG.md` | New release section at top | Commits since last release |

## Steps

### 1. Find Last Release and Examine All Changed Files

```bash
git log --oneline -3 -- CHANGELOG.md
```

From the most recent release commit, examine which files were touched:

```bash
gh pr view <PR_NUMBER> --json title,headRefName
git show <COMMIT> --stat
git show <COMMIT> -- app.config.ts
```

The `git show --stat` step is critical -- it reveals ALL files that were part of the last release. Do not skip it.

### 2. Get Current Values

```bash
grep -m1 '"version"' package.json
grep -E 'runtimeVersion|buildNumber|versionCode' app.config.ts
```

### 3. Get Commits for Changelog

```bash
git log <LAST_RELEASE_COMMIT>..HEAD --oneline --no-merges
```

### 4. Create Branch and Apply Changes

```bash
git checkout -b release/<VERSION> develop
```

Apply all changes:
- `package.json`: bump `version` to new version
- `app.config.ts`: bump `runtimeVersion` and `version` to new version, increment `buildNumber` (string) by 1, increment `versionCode` (number) by 1
- `CHANGELOG.md`: add new section at top with the commit list from step 3

### 5. Commit, Push, and Create PR

```bash
git add package.json app.config.ts CHANGELOG.md
git commit -m "APP: Release <VERSION>"
git push -u origin release/<VERSION>
gh pr create --base develop --title "APP: Release <VERSION>" --body ""
```

## Naming Conventions

- **Branch:** `release/<version>` (e.g., `release/8.11.0`)
- **Commit message:** `APP: Release <version>`
- **PR title:** `APP: Release <version>`
- **PR body:** empty
- **PR base:** `develop`

## Common Mistakes

- **Forgetting `app.config.ts`** -- this file has 4 separate fields to update
- **`buildNumber` is a string**, `versionCode` is a number -- do not mix formats
- **`buildNumber`/`versionCode` increment by 1** regardless of version bump size (8.10.3 -> 8.11.0 still only increments build number by 1)
- **Not checking `git show --stat`** on the last release commit -- always verify which files were touched
