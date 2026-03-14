---
name: sentry-investigate
description: Use when investigating a Sentry error, analyzing crash reports, or debugging production issues from Sentry. Triggers on Sentry URLs, event IDs, or mentions of Sentry issues.
---

# Investigate Sentry Issue

Investigate a Sentry error, analyze the root cause, and find a fix.

## Prerequisites

Check credentials and auto-configure if missing:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "Sentry token not configured. Running setup..."
  node "${CLAUDE_SKILL_DIR}/setup.js"
fi
```

## Configuration

- **org**: stadion
- **project**: liverpool-app

## Investigation Flow

```
1. Parse input -> extract issue_id or event_id
2. Fetch event data via sentry-api.js or sentry-cli
3. Check sourcemaps status (for JS errors)
4. Analyze error:
   - Error type and message
   - Stack trace / culprit
   - Breadcrumbs (critical for understanding timing)
   - Context (device, OS, app version)
5. Cross-reference with project:
   - Search codebase for culprit
   - Check package.json for SDK versions
   - Search native code if native crash
6. Search GitHub for known issues
7. Check for available patches/updates
8. Confirm understanding with user (WAIT for response)
9. Propose fix or report to SDK vendor
```

## Quick Diagnosis Checklist

Before deep diving, check these common causes:

| Check | How to Verify | Fix |
|-------|---------------|-----|
| Missing error handling? | Look for `.catch()` or try/catch around failing code | Add error handling |
| Network issue? | Breadcrumbs show `status_code: 0` | Handle offline gracefully |
| User has fallback? | Check if defaults/fallbacks exist before the failing call | If yes, error is non-critical |
| Your code or library? | Check if culprit path is in `node_modules/` | Library: search GitHub issues |

**80% of JS errors are missing `.catch()` handlers. Check that first.**

## Severity Assessment

Before fixing, determine impact:

| Question | If Yes |
|----------|--------|
| Does app crash? | Critical -- fix immediately |
| Does user lose functionality? | High -- fix soon |
| Are defaults/fallbacks in place? | Low -- add error handling to silence |
| Only affects edge cases (offline, old OS)? | Low -- handle gracefully |

## Common React Native Error Patterns

| Error Pattern | Likely Cause | Typical Fix |
|---------------|--------------|-------------|
| `TypeError: undefined is not an object` | Missing optional chaining | Add `?.` |
| `TypeError: null is not an object` | Null not handled | Null checks |
| `[module/failure] fetch()` | Network issue + no `.catch()` | Add error handling |
| `NSInternalInconsistencyException` | Native iOS crash, usually SDK | Check culprit SDK |
| `observeValueForKeyPath not handled` | KVO bug in native SDK | Report to SDK vendor |
| `Network request failed` | Offline/timeout | Retry logic, offline handling |
| Culprit contains `RCTxxxx` | React Native bridge issue | Check RN version |
| Culprit contains `EXxxxx` | Expo module issue | Check Expo SDK version |

## Handling Images and Attachments

If the Sentry issue or event data contains screenshots or images:

1. Invoke the `attachment-documenter` agent via Agent tool with:
   - subagent_type: "attachment-documenter"
   - Image URLs
   - Naming: `sentry_{issue-id}_{filename}`
   - Task context: error title + culprit + 1-2 sentence summary

2. Read existing attachment documentation:
   ```bash
   ls .claude/attachments/sentry_{issue-id}_*.md 2>/dev/null
   ```
   Include visual descriptions in your investigation.

3. Incorporate relevant attachment details (UI state, error messages visible, user actions) in your analysis.

## Step 1: Parse Input and Find Event

### Input formats supported

```
# Full URLs
https://stadion.sentry.io/issues/{issue_id}/
https://stadion.sentry.io/issues/{issue_id}/events/{event_id}/
https://sentry.io/organizations/stadion/issues/{issue_id}/

# Just the event ID (with or without dashes)
2f197d2f4b7e42e58ce2fb25ab10e52a
2f197d2f-4b7e-42e5-8ce2-fb25ab10e52a
```

### Find event/issue using sentry-cli

```bash
npx sentry-cli events list -o stadion -p liverpool-app
npx sentry-cli issues list -o stadion -p liverpool-app -s unresolved
npx sentry-cli issues list -o stadion -p liverpool-app -s unresolved | grep "ErrorName"
```

## Step 2: Fetch Event Data

### Fetch using sentry-api.js

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."

# Fetch issue metadata (includes error details, stats, metadata)
node "$PLUGIN_ROOT/scripts/sentry-api.js" issue stadion liverpool-app {issue_id} | jq '.'

# Fetch all events for an issue (includes breadcrumbs, full context)
node "$PLUGIN_ROOT/scripts/sentry-api.js" events stadion liverpool-app {issue_id} | jq '.'

# Fetch specific event
node "$PLUGIN_ROOT/scripts/sentry-api.js" event stadion liverpool-app {issue_id} {event_id} | jq '.'
```

### Key data to extract from issue metadata

```bash
# Basic issue info
cat /tmp/sentry_issue.json | jq '{
  id: .id,
  shortId: .shortId,
  title: .title,
  culprit: .culprit,
  count: .count,
  userCount: .userCount,
  firstSeen: .firstSeen,
  lastSeen: .lastSeen,
  level: .level,
  platform: .platform
}'

# Check metadata for native crash details
cat /tmp/sentry_issue.json | jq '.metadata'
```

### Key data to extract from event

```bash
# Breadcrumbs (shows what happened before crash)
cat /tmp/sentry_event.json | jq '.entries[] | select(.type == "breadcrumbs") | .data.values[-15:]'

# Device and context
cat /tmp/sentry_event.json | jq '{
  release: .release,
  environment: .environment,
  contexts: .contexts
}'

# Tags
cat /tmp/sentry_event.json | jq '.tags'
```

## Step 3: Check Sourcemaps Status (JS Errors Only)

### Signs of MISSING sourcemaps
1. Stack frames show minified paths: `index.android.bundle:123:456`
2. No `context_line` in stack frames
3. Single-letter variable/function names

### Signs of WORKING sourcemaps
1. Stack frames show original paths: `src/screens/HomeScreen.tsx:45`
2. `context_line` present with readable code

### If sourcemaps are missing

```bash
cat /tmp/sentry_event.json | jq -r '.release'
```

Then invoke /tb:sentry-sourcemaps with the release name.

## Step 4: Analyze Error Type

### For JavaScript Errors

```bash
# Error type and message
cat /tmp/sentry_event.json | jq '{
  type: .entries[0].data.values[0].type,
  value: .entries[0].data.values[0].value
}'

# Stack trace (in-app frames)
cat /tmp/sentry_event.json | jq '[.entries[0].data.values[0].stacktrace.frames | reverse | .[] | select(.inApp == true)]'
```

### For Native iOS Crashes

Check the `culprit` and `metadata.value` fields for SDK method swizzles, framework names, and KVO key paths.

```bash
cat /tmp/sentry_issue.json | jq '{
  culprit: .culprit,
  metadata: .metadata
}'
```

#### Common Native Crash Patterns

| Culprit Pattern | Likely Source | Action |
|-----------------|---------------|--------|
| `WKWebView(OneSwizzling)` | MXO/Medallia/Thunderhead SDK | Report to Medallia |
| `STScreenTimeConfigurationObserver` | iOS Screen Time + SDK conflict | SDK issue |
| `RCTxxxx` | React Native bridge | Check RN version |
| `EXxxxx` | Expo module | Check Expo SDK |
| `observeValueForKeyPath` not handled | KVO observer issue | SDK swizzling bug |

## Step 5: Analyze Breadcrumbs

Breadcrumbs reveal WHEN and WHERE the crash occurs:

```bash
cat /tmp/sentry_event.json | jq '[.entries[] | select(.type == "breadcrumbs") | .data.values[-15:] | .[] | {
  timestamp: .timestamp,
  type: .type,
  category: .category,
  message: .message,
  data: .data
}]'
```

### What to look for

| Breadcrumb Pattern | Indicates |
|--------------------|-----------|
| `navigation` to `index` | Crash on app open |
| `navigation` to specific screen | Crash when entering screen |
| HTTP requests to SDK URLs | SDK activity before crash |
| `xhr`/`fetch` errors | Network issues |
| `console` errors | JS errors before crash |

### Common SDK URLs in breadcrumbs

| URL Pattern | SDK |
|-------------|-----|
| `thunderhead.com` / `eu2.thunderhead.com` | MXO/Medallia |
| `appsflyer` | AppsFlyer |
| `firebase` / `google` | Firebase |
| `sentry.io` | Sentry itself |
| `contentful.com` | Contentful CMS |
| `ably.io` | Ably realtime |

## Step 6: Cross-Reference with Project

### Search codebase for culprit SDK

```bash
grep -r "thunderhead\|mxo\|medallia" src/ --include="*.ts" --include="*.tsx"
grep -i "thunderhead\|mxo\|medallia" package.json
grep -r "OneSwizzling\|Thunderhead" ios/ --include="*.m" --include="*.swift" --include="*.h"
grep -i "thunderhead\|mxo\|medallia" ios/Podfile
```

### For native crashes, check

1. Native modules in `ios/` and `android/` directories
2. `Podfile.lock` for iOS native dependencies and versions
3. `pod outdated` for available updates
4. Build settings for method swizzling configurations

### Get SDK version

```bash
ls -la node_modules/ | grep -i "mxo\|thunderhead\|medallia"
grep -A2 "MXO\|Thunderhead" ios/Podfile.lock
```

## Step 7: Search for Known GitHub Issues

### Search strategy

1. Search the SDK's GitHub repo for the exact error
2. Search for the culprit method name
3. Search for iOS version + error pattern

### Common repos to check

| SDK | GitHub Repo |
|-----|-------------|
| react-native-webview | `react-native-webview/react-native-webview` |
| expo-web-browser | `expo/expo` |
| MXO/Medallia | Check their support portal |
| AppsFlyer | `AppsFlyerSDK/appsflyer-react-native-plugin` |
| Firebase | `invertase/react-native-firebase` |

## Step 7b: Check for Available Patches

After identifying the offending library, check if a fix is available:

```bash
npm view {package-name} versions --json 2>/dev/null | jq '[.[] | select(test("alpha|beta|rc|nightly") | not)][-10:]'
cat package.json | jq '.dependencies["{package-name}"]'
npx expo install {package-name} --check
```

For native iOS pods:

```bash
cd ios && pod outdated
```

## Step 8: Confirm Understanding

**CRITICAL**: Before proposing a fix, present your root cause analysis and ask the user to confirm.

```
## My Analysis of {issue_id}

**Error**: [error type and message]
**Root cause**: [1-2 sentences explaining what is happening]
**Severity**: [Critical/High/Low] -- [brief justification]
**Category**: [Your code / Third-party SDK / Unknown]

Is this analysis correct, or should I investigate further?
```

WAIT for user confirmation before proceeding.

## Step 9: Propose Fix or Report

### If it is YOUR code

Provide:
1. Root cause explanation
2. Code fix with before/after
3. Prevention strategy

### If it is a THIRD-PARTY SDK bug

1. Document: Sentry issue/event IDs, error message, culprit, breadcrumbs, SDK version, OS version, impact
2. Report to vendor: GitHub issues (if open source) or SDK support portal
3. Temporary mitigations: disable SDK on affected platform, update SDK, add error boundaries

## Quick Commands Reference

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."

# Fetch issue details
node "$PLUGIN_ROOT/scripts/sentry-api.js" issue stadion liverpool-app {issue_id}

# Fetch events for issue
node "$PLUGIN_ROOT/scripts/sentry-api.js" events stadion liverpool-app {issue_id}

# Fetch specific event
node "$PLUGIN_ROOT/scripts/sentry-api.js" event stadion liverpool-app {issue_id} {event_id}

# List recent events via sentry-cli
npx sentry-cli events list -o stadion -p liverpool-app

# List unresolved issues
npx sentry-cli issues list -o stadion -p liverpool-app -s unresolved

# Check sourcemaps for a release
npx sentry-cli sourcemaps list -o stadion -p liverpool-app -r "{release}"

# Resolve issue after fixing
npx sentry-cli issues resolve -o stadion -p liverpool-app -i {issue_id}

# Check for package updates
npm view {package-name} versions --json | jq '[.[] | select(test("alpha|beta|rc|nightly") | not)][-10:]'
npm view {package-name} version
cat package.json | jq '.dependencies["{package-name}"]'
npx expo install {package-name} --check
```
