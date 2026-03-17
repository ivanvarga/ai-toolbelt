---
name: sentry-sourcemaps
description: Use when uploading missing source maps to Sentry for a release, fixing unsymbolicated stack traces, or when Sentry shows 'No Source File With Matching Debug ID'. Triggers on sourcemap upload, missing source maps, or debug ID issues.
---

# Upload Sentry Source Maps

Upload missing source maps to Sentry for a specific release.

## Prerequisites

Check Sentry token is configured:

```bash
if ! security find-generic-password -s "tb.sentry-token" >/dev/null 2>&1; then
  echo "Sentry token not configured. Run: node ${CLAUDE_SKILL_DIR}/../../skills/sentry-investigate/setup.js"
  exit 1
fi
```

The Sentry token is shared with /tb:sentry-investigate. Run its setup.js to configure.

## Auto-Detection

From the release name, automatically determine:

| Bundle ID | Platform | Environment |
|-----------|----------|-------------|
| `tv.liverpoolfc` | Android | Production |
| `liverpoolfc.lfcmnc` | iOS | Production |
| `com.liverpoolfc.staging` | Android/iOS | Staging |
| `com.lfc.dev` | Android/iOS | Dev |

Extract version and build number:

```
tv.liverpoolfc@6.30.15+979
|______________|  |_____|  |_|
   bundle_id     version  build_number
```

From `app.config.ts` Sentry plugin config:
- **org**: stadion
- **project**: liverpool-app

## Key Requirements for Source Maps to Work

1. Upload BOTH files: bundle (`.hbc` or `.jsbundle`) AND source map (`.map`)
2. Include `--dist`: must match build number (e.g., `--dist "979"`)
3. Use `--debug-id-reference`: required for Hermes bundles
4. Both debug ID fields: source map needs both `debug_id` and `debugId` fields

## Decision Flow

```
1. Parse release name -> get platform, version, build_number
2. Query EAS for commit -> npx eas-cli build:list
3. Verify release exists in Sentry -> npx sentry-cli releases list
4. Choose method:
   - Method 1: Local Native Build (guaranteed matching debug IDs)
   - Method 2: OTA Export (requires debug ID from Sentry error)
```

## Method 1: Local Native Build (Preferred)

Use when you can run a local native build. Debug IDs will match automatically.

### Steps

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."

# 1. Checkout commit
git stash push -m "sentry-sourcemap-temp" 2>/dev/null || true
git checkout {commit_hash}

# 2. Clean and prebuild
rm -rf android ios dist
yarn prebuild:production

# 3. Build release variant
# Android:
npx expo run:android --variant release --no-install
# iOS:
npx expo run:ios --configuration Release --no-install

# 4. Upload source maps (pass token from Keychain)
# Android:
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) \
npx sentry-cli sourcemaps upload \
  --release "{release}" \
  --dist "{build_number}" \
  --org stadion \
  --project liverpool-app \
  --debug-id-reference \
  android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle \
  android/app/build/generated/sourcemaps/react/release/index.android.bundle.map

# iOS:
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) \
npx sentry-cli sourcemaps upload \
  --release "{release}" \
  --dist "{build_number}" \
  --org stadion \
  --project liverpool-app \
  --debug-id-reference \
  ios/build/Build/Products/Release-iphoneos/main.jsbundle \
  ios/build/Build/Products/Release-iphoneos/main.jsbundle.map

# 5. Verify upload
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) \
npx sentry-cli sourcemaps list --org stadion --project liverpool-app --release "{release}"

# 6. Cleanup
rm -rf android ios
git checkout main
git stash pop 2>/dev/null || true
```

## Method 2: OTA Export with Debug ID Replacement (Fallback)

Use when local native build is not feasible. Requires the debug ID from the Sentry error.

### Get Debug ID

Open the Sentry error, click a stack frame, and copy the debug ID from the "No Source File With Matching Debug ID" message.

### Steps

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."

# 1. Checkout commit
git stash push -m "sentry-sourcemap-temp" 2>/dev/null || true
git checkout {commit_hash}

# 2. Export with source maps
rm -rf dist
EXPO_PUBLIC_APP_VARIANT=production npx expo export --source-maps --platform {platform} --output-dir dist

# 3. Get generated debug ID from source map
tail -c 100 dist/_expo/static/js/{platform}/*.hbc.map

# 4. Replace debug ID with the original from Sentry error
sed -i '' 's/{generated_debug_id}/{sentry_debug_id}/g' dist/_expo/static/js/{platform}/*.hbc.map
sed -i '' 's/"debugId":"{sentry_debug_id}"/"debug_id":"{sentry_debug_id}","debugId":"{sentry_debug_id}"/g' dist/_expo/static/js/{platform}/*.hbc.map

# 5. Upload BOTH bundle and source map
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) \
npx sentry-cli sourcemaps upload \
  --release "{release}" \
  --dist "{build_number}" \
  --org stadion \
  --project liverpool-app \
  --debug-id-reference \
  dist/_expo/static/js/{platform}/*.hbc \
  dist/_expo/static/js/{platform}/*.hbc.map

# 6. Verify upload
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) \
npx sentry-cli sourcemaps list --org stadion --project liverpool-app --release "{release}"

# 7. Cleanup
rm -rf dist
git checkout main
git stash pop 2>/dev/null || true
```

## Quick Reference

### Parse Release Name

```
tv.liverpoolfc@6.30.15+979
Production:  tv.liverpoolfc (Android), liverpoolfc.lfcmnc (iOS)
Staging:     com.liverpoolfc.staging (both platforms)
Dev:         com.lfc.dev (both platforms)
```

### Query EAS for Commit

```bash
# Android
npx eas-cli build:list --platform android --json --non-interactive --limit 50 2>/dev/null | \
  jq -r '.[] | select(.appBuildVersion == "{build_number}") | {commit: .gitCommitHash, version: .appVersion, profile: .buildProfile}'

# iOS
npx eas-cli build:list --platform ios --json --non-interactive --limit 50 2>/dev/null | \
  jq -r '.[] | select(.buildNumber == "{build_number}") | {commit: .gitCommitHash, version: .appVersion, profile: .buildProfile}'
```

### Verify Sentry Release

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) \
npx sentry-cli releases list -o stadion -p liverpool-app | grep "{build_number}"
```

## Prevention

To avoid missing source maps in future builds, ensure `SENTRY_AUTH_TOKEN` is available in the EAS build environment via EAS secrets.
