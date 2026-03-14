---
name: mbridge
description: Use when interacting with mobile apps on iOS simulators, Android emulators, or real devices. Use when tapping UI elements, navigating screens, testing mobile flows, verifying screen content, opening deeplinks, or automating any mobile device interaction.
allowed-tools: Bash(mbridge:*)
---

# Mobile App Automation with mbridge

## Overview

mbridge is a CLI for controlling iOS and Android devices (real + simulators/emulators). The core principle: **element targeting replaces dump+jq+tap**. One mbridge command replaces the 3-step pattern of dumping UI, querying with jq, and tapping coordinates.

Every mbridge command is self-contained. No wrapper scripts, no bash helpers, no sourcing boilerplate. Claude sequences raw `mbridge` commands directly in Bash tool calls.

**Key flags for element targeting:** `--text`, `--id`, `--type`, `--exact`, `--unique`. These work on `action tap`, `action swipe`, `action type`, and `ui find`. Prefer these over coordinate-based interaction.

## Quick Start

```bash
mbridge device list
mbridge action tap $DEV --text "Sign Up"
mbridge action type $DEV "user@test.com" --text "Email" --clear
mbridge app open-url $DEV "myapp://settings"
mbridge verify text $DEV "Welcome"
```

## Pre-flight Check

Before automating, verify the app is running. Poll `mbridge app foreground` until the expected bundle ID appears. No fixed sleep.

```bash
mbridge app launch $DEV com.example.app
mbridge app foreground $DEV
```

If `foreground` does not return the expected bundle ID after several attempts, the app is not running. Tell the user the app is not launchable and ask them to build/install it. Do not try to build the app yourself.

## Device Selection

When `mbridge device list` returns multiple devices, **ask the user which one to use**.

**Tradeoffs:**
- **Simulator/emulator:** No signing config needed, faster to reset, but may not match real device behavior
- **Real Android device:** Zero signing setup, true device behavior, best for quick testing
- **Real iOS device:** Requires Apple Developer team + provisioning, but most accurate iOS testing

When in doubt, ask the user which device they prefer.

## Command Reference

All commands produce JSON output to stdout. Errors produce `{"error": "..."}` to stderr and exit 1. Global flag: `mbridge --verbose` / `-v` enables verbose output.

### device

```bash
mbridge device list
mbridge device list --platform ios
mbridge device list --platform android
mbridge device boot DEVICE_ID
mbridge device info DEVICE_ID
```

**device list** returns an array of connected devices:

```json
[
  {"id": "ABCD-1234-...", "name": "iPhone 16 Pro", "state": "Booted", "platform": "ios"},
  {"id": "emulator-5554", "name": "Pixel_8", "state": "device", "platform": "android"}
]
```

**device info** returns extended info including screen dimensions.

### app

```bash
mbridge app list DEVICE_ID
mbridge app foreground DEVICE_ID
mbridge app launch DEVICE_ID BUNDLE_ID
mbridge app open-url DEVICE_ID URL
```

**app foreground** returns the currently active app:

```json
{"packageName": "com.example.app", "appName": "MyApp", "version": "1.0"}
```

**app launch** starts an app by bundle/package ID.

**app open-url** opens a deeplink or URL on the device. Use this for navigation when you do not need to test the navigation path itself.

### ui

```bash
mbridge ui dump DEVICE_ID
mbridge ui find DEVICE_ID [--id ID] [--text TEXT] [--exact] [--type TYPE] [--xpath XPATH]
```

**ui dump** returns the full normalized UI element tree as a JSON array.

**ui find** filters elements by one or more criteria:

- `--text TEXT` -- substring match on label/text content
- `--id ID` -- match by accessibility ID
- `--type TYPE` -- match by element type (e.g., Button, TextField)
- `--exact` -- require exact text match instead of substring
- `--xpath XPATH` -- filter by XPath expression

```json
[
  {
    "type": "Button",
    "label": "Settings",
    "accessibility_id": "settings_tab",
    "bounds": {"x": 270, "y": 780, "width": 100, "height": 44},
    "center": {"x": 320, "y": 802},
    "enabled": true,
    "visible": true,
    "children": []
  }
]
```

### action

#### tap

```bash
mbridge action tap DEVICE_ID --text "Sign Up"
mbridge action tap DEVICE_ID --id "submit_btn"
mbridge action tap DEVICE_ID --type "Button" --text "OK" --exact
mbridge action tap DEVICE_ID --text "Submit" --unique
mbridge action tap DEVICE_ID --x 305 --y 434
```

Taps an element found by targeting flags, or at explicit coordinates. Prefer element targeting over coordinates.

- `--text TEXT` -- find element by text (substring match)
- `--id ID` -- find element by accessibility ID
- `--type TYPE` -- find element by type
- `--exact` -- require exact text match
- `--unique` -- fail if multiple elements match (prevents ambiguous taps)
- `--x X --y Y` -- tap at explicit coordinates (fallback only)

```json
{"status": "tapped", "x": 320, "y": 802}
```

#### swipe

```bash
mbridge action swipe DEVICE_ID up
mbridge action swipe DEVICE_ID down --distance 0.3
mbridge action swipe DEVICE_ID left --text "List Item"
mbridge action swipe DEVICE_ID right --from 100,400
```

Swipes in a direction from screen center, an element, or explicit coordinates.

- `DIRECTION` -- up, down, left, right (required)
- `--distance FLOAT` -- swipe distance as fraction of screen (default 0.5)
- `--text TEXT` -- swipe starting from element found by text
- `--id ID` -- swipe starting from element found by accessibility ID
- `--type TYPE` -- swipe starting from element found by type
- `--exact` -- require exact text match for element targeting
- `--from X,Y` -- swipe starting from explicit coordinates

```json
{"status": "swiped", "direction": "up", "from": {"x": 195, "y": 422}, "to": {"x": 195, "y": 0}}
```

#### type

```bash
mbridge action type DEVICE_ID "hello world"
mbridge action type DEVICE_ID "user@test.com" --text "Email"
mbridge action type DEVICE_ID "new value" --id "name_field" --clear
mbridge action type DEVICE_ID "line1\nline2"
```

Types text with optional element targeting (taps element first) and escape sequences.

- `TEXT` -- text to type (required argument). Supports escape sequences: `\n` (enter), `\b` (backspace), `\t` (tab), `\e` (escape)
- `--text ELEMENT_TEXT` -- find element by text and tap it before typing
- `--id ID` -- find element by accessibility ID and tap before typing
- `--type TYPE` -- find element by type and tap before typing
- `--exact` -- require exact text match for element targeting
- `--clear` -- clear field contents before typing

```json
{"status": "typed", "text": "user@test.com"}
```

### verify

```bash
mbridge verify text DEVICE_ID "Welcome"
mbridge verify text DEVICE_ID "Exact Title" --exact
```

Takes a screenshot and uses OCR (pytesseract) to verify expected text is visible on screen.

- `EXPECTED` -- text to look for (required argument)
- `--exact` -- require the entire OCR text to match exactly (rarely needed)

Success:
```json
{"found": true, "text": "Welcome"}
```

Failure (includes full OCR output for debugging):
```json
{"found": false, "expected": "Welcome", "ocr_text": "Wecone to MyApp\nSign in below..."}
```

## Element Output Format

All elements from `ui dump`, `ui find`, and internal element resolution share this normalized schema:

```json
{
  "type": "Button",
  "label": "Sign Up",
  "accessibility_id": "signup_btn",
  "bounds": {"x": 100, "y": 200, "width": 150, "height": 44},
  "center": {"x": 175, "y": 222},
  "enabled": true,
  "visible": true,
  "children": []
}
```

Fields: `type` (element class), `label` (visible text), `accessibility_id` (accessibility identifier), `bounds` (position and size), `center` (tap target), `enabled`, `visible`, `children` (nested elements).

## Navigation Strategy

Priority order for reaching a screen:

1. **Deeplinks** -- `mbridge app open-url $DEV "myapp://target"` for instant navigation. Use when you do not need to test the navigation path itself.
2. **Element targeting** -- `mbridge action tap $DEV --text "Settings"` to navigate through UI. Use when testing that navigation actually works.
3. **Swipe + retry** -- `mbridge action swipe $DEV down` then re-find with `mbridge ui find`. Use for off-screen elements.
4. **OCR verify** -- `mbridge verify text $DEV "Expected"` as a verification fallback when UI elements lack identifiers or the text is rendered in a non-standard way.

**When to use deeplinks vs taps:**
- Deeplink: setup/reset, navigating to a starting point, when the navigation flow itself is not under test
- Tap: when testing that a button/link actually works, verifying navigation flows end-to-end

## Deeplink Pitfalls

**Same-screen deeplink will not refresh.** Opening a deeplink to the screen you are already on does NOT remount the screen. Navigate to a different screen first, then deeplink back:

```bash
mbridge app open-url $DEV "myapp://home" && \
mbridge app open-url $DEV "myapp://settings"
```

**Cold start timing.** After `mbridge app launch`, the app may not be ready for deeplinks immediately. Poll `mbridge app foreground` until the expected bundle ID appears before sending deeplinks. Do not use fixed sleep.

## Multi-step Automation Pattern

Batch 3-5 mbridge commands per Bash tool call using `&&`. Each command is self-contained -- no sourcing, no env vars, no boilerplate.

```bash
DEV="ABCD-1234"
mbridge app open-url $DEV "myapp://signup" && \
mbridge action type $DEV "user@test.com" --text "Email" && \
mbridge action type $DEV "secret123" --text "Password" && \
mbridge action tap $DEV --text "Sign Up" && \
mbridge verify text $DEV "Welcome"
```

Batching reduces context overhead. Do not make one Bash tool call per mbridge command.

## Subagent Pattern

For 5+ sequential test flows, dispatch a subagent. The subagent runs mbridge commands directly -- same pattern, just more steps.

**Single device = sequential only.** Never run parallel subagents on the same device.

Subagent prompt template:

```
Run the following test flows on device $DEV using mbridge commands.
App bundle: $BUNDLE. Deeplink scheme: $SCHEME.

Test 1: [description]
Test 2: [description]
...

Use `mbridge app open-url` to navigate between flows.
Use `mbridge verify text` to confirm each step.
Report pass/fail for each test.
```

## Cache Strategy (.mbridge/)

### Permission Logic

```
.mbridge/ exists? -> Use silently
.mbridge/ does not exist? -> Ask user once
  -> yes: Create .mbridge/, add to .gitignore if not present
  -> no: Work without persistent config (pass device/bundle on each call)
```

### File Structure

```
.mbridge/
  config.json       # Device/app settings: device_id, bundle_id, deeplink_scheme
  deeplinks.md      # Discovered deeplink schema (persisted across sessions)
```

No `cache/*.json` files needed -- mbridge handles internal dumps. Only persistent project-level config and deeplink research need files.

### config.json

```json
{
  "device_id": "ABCD-1234",
  "bundle_id": "com.example.app",
  "deeplink_scheme": "myapp"
}
```

Read at session start to avoid re-asking device/bundle. Update when user switches devices.

### .gitignore

On first `.mbridge/` creation, add to `.gitignore` if not already present:

```
# mbridge automation cache
.mbridge/
```

### Deeplink Researcher

Dispatch a subagent to discover the app's deeplink schema once per project. Cache results to `.mbridge/deeplinks.md`.

```
Research deeplink configuration for the app in this codebase.
Search for: scheme field, route definitions, linking configuration.
Write results to .mbridge/deeplinks.md with:
- Deeplink scheme (e.g., myapp://)
- All available routes with parameters
- Any auth-gated routes
```

## Workflow Examples

### Navigate to a specific screen

```bash
DEV="ABCD-1234"
mbridge app open-url $DEV "myapp://settings" && \
mbridge verify text $DEV "Settings"
```

### Fill a form

```bash
DEV="ABCD-1234"
mbridge app open-url $DEV "myapp://signup" && \
mbridge action type $DEV "user@test.com" --text "Email" --clear && \
mbridge action type $DEV "secret123" --text "Password" --clear && \
mbridge action tap $DEV --text "Create Account" && \
mbridge verify text $DEV "Welcome"
```

### Scroll to find an element

```bash
DEV="ABCD-1234"
mbridge ui find $DEV --text "Privacy Policy"
```

If not found:

```bash
mbridge action swipe $DEV up --distance 0.5 && \
mbridge ui find $DEV --text "Privacy Policy"
```

Repeat swipe + find until the element appears or you reach the bottom.

### Multi-step UAT flow

```bash
DEV="ABCD-1234"
mbridge app launch $DEV com.example.app && \
mbridge app foreground $DEV

mbridge app open-url $DEV "myapp://home" && \
mbridge action tap $DEV --text "Products" && \
mbridge verify text $DEV "Running Shoes"

mbridge action tap $DEV --text "Running Shoes" && \
mbridge action tap $DEV --text "Add to Cart" && \
mbridge verify text $DEV "Cart"

mbridge action tap $DEV --text "Checkout" && \
mbridge verify text $DEV "Payment"
```

### Inspect element details

```bash
DEV="ABCD-1234"
mbridge ui find $DEV --text "Submit" --exact
```

Returns full element details including bounds, center, type, and accessibility_id. Use this to debug tapping issues or verify element state.

## Known Limitations

### UIAutomator idle state issue (Android)

Screens with constantly updating timers or animations prevent UIAutomator from reaching idle state. Both `mbridge ui dump` and `mbridge ui find` may return 0 elements. `mbridge action tap --text` will also fail since it uses ui dump internally.

**Workaround:** Use `mbridge verify text` (OCR-based, does not rely on UIAutomator) for verification. Navigate away from the timer screen to do UI operations, then navigate back.

### Empty TextInputs invisible in UI dump

React Native TextInputs with no value do not always appear in UIAutomator dumps (Android). Only filled fields are reliably visible.

**Workaround:** Use `mbridge ui find` to locate a nearby visible element, then calculate the empty field position relative to it. Use `mbridge action tap --x X --y Y` for coordinate-based tapping as a fallback.

### OCR imperfect matching

`mbridge verify text` uses pytesseract which is imperfect. Special characters, small text, and unusual fonts may not OCR correctly. On failure, check the `ocr_text` field in the response for what was actually recognized.

**Workaround:** Use `mbridge ui find` for structural verification when elements have identifiers. Reserve `verify text` for cases where UI elements lack labels.

### Android BACK exits app at navigation root

On Android, the system BACK button at the root of the navigation stack exits the app entirely. Use deeplinks (`mbridge app open-url`) to navigate away instead of hardware BACK.

## Recommended Permissions

Add to your Claude settings.json so mbridge commands do not trigger permission prompts:

```json
{
  "permissions": {
    "allow": [
      "Bash(mbridge:*)",
      "Bash(adb:*)",
      "Bash(xcrun:*)"
    ]
  }
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing bash wrapper functions or test-helpers.sh | mbridge commands are self-contained one-liners. No wrappers needed |
| Piping `ui dump` to a file and querying with jq | Use `mbridge ui find --text "Label"` or `--text` flags on action commands directly |
| Using coordinate-based taps when element targeting works | Use `--text`, `--id`, or `--type` flags. Coordinates only when no identifiers exist |
| Forgetting `--exact` for ambiguous text matches | Add `--exact` when text like "S" could match "Settings", "Search", "Sign Up" |
| Using `--unique` without `--exact` | Combine both when you need precisely one exact match |
| Using screenshots to check screen state | Use `mbridge ui find` or `mbridge verify text` instead |
| One mbridge command per Bash tool call | Batch 3-5 commands with `&&` to reduce context overhead |
| Fixed `sleep` after tap or navigate | Poll `mbridge app foreground` or use `mbridge verify text` to confirm state |
| Guessing mbridge commands not listed here | Only use commands documented in this reference |
| Using BACK on Android at navigation root | Use `mbridge app open-url` to navigate away instead |
| Re-opening same deeplink expecting refresh | Navigate to a different screen first, then deeplink back |
| Sending commands before app is ready | Poll `mbridge app foreground` until expected bundle ID appears after launch |
| Running parallel subagents on same device | Single device = sequential only |
| Skipping pre-flight check | Always verify app launches with `mbridge app foreground` before starting |
| Trying to build or install the app yourself | Ask the user to build. Do not run build commands |
| Using `xcrun simctl` or `adb` directly for things mbridge does | Use mbridge commands -- they handle platform differences automatically |
| Sourcing env files or setting up boilerplate | Each mbridge command is standalone. No env.sh, no sourcing |
| Writing a `function tap_text()` wrapper | `mbridge action tap --text "Label"` already does this in one command |
| Using `ui dump` output to manually calculate tap coordinates | Use `mbridge action tap --text` which does dump + find + tap atomically |

## Red Flags - STOP

- About to write a bash wrapper function or source a helpers file -> each mbridge command is self-contained
- About to pipe `ui dump` to a file and query with jq -> use `mbridge ui find` or `--text` flags instead
- About to write manual jq queries on mbridge output -> use `ui find` filtering flags directly
- About to use `--x`/`--y` coordinates when the element has identifiable text/id -> use `--text` or `--id`
- About to take a screenshot to check what screen you are on -> use `mbridge ui find` or `mbridge verify text`
- About to make a single-command Bash tool call -> batch with adjacent operations using `&&`
- About to use `sleep` after a tap or navigation -> poll `foreground` or use `verify text` instead
- About to spawn a subagent to find one element -> use `mbridge ui find` directly
- About to guess an mbridge command not listed here -> check this reference
- About to use `xcrun simctl` or `adb` for something mbridge can do -> use the mbridge equivalent
- About to research deeplinks again -> check `.mbridge/deeplinks.md` cache first
- About to use BACK to leave a screen on Android -> use deeplink to a different screen instead
- About to re-open same deeplink expecting a refresh -> navigate away first, then back
- About to launch parallel subagents on same device -> sequential only, one device at a time
- App crashed on launch -> do not try to build it, ask the user to fix and confirm
- About to create `.mbridge/` without asking the user -> check if it exists first, ask once if not
