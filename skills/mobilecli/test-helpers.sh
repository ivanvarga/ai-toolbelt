#!/bin/bash
# Generic mobilecli UAT test helpers
# Source this file, then set DEVICE, APP_BUNDLE, DEEPLINK_SCHEME, CACHE_DIR before using

# Required env vars (set before sourcing or after):
#   DEVICE          - mobilecli device ID
#   APP_BUNDLE      - app bundle/package ID (e.g. com.example.app)
#   DEEPLINK_SCHEME - deeplink scheme (e.g. myapp)
#   CACHE_DIR       - directory to cache UI dumps (default: .mobilecli/cache)

CACHE_DIR="${CACHE_DIR:-.mobilecli/cache}"
mkdir -p "$CACHE_DIR"

# ── UI Dump & Cache ──────────────────────────────────

# Dump UI and cache it. Usage: dump_ui <screen_name>
# Retries up to 3 times on failure (helps with RN timer-heavy screens
# where UIAutomator intermittently fails with "could not get idle state")
dump_ui() {
  local name="$1"
  local outfile="$CACHE_DIR/${name}.json"
  local attempt count
  for attempt in 1 2 3; do
    mobilecli dump ui --device "$DEVICE" > "$outfile" 2>/dev/null
    count=$(jq -r '.data.elements | length // 0' "$outfile" 2>/dev/null)
    if [ -n "$count" ] && [ "$count" != "null" ] && [ "$count" -gt 0 ] 2>/dev/null; then
      break
    fi
    [ "$attempt" -lt 3 ] && sleep 0.5
  done
  echo "$outfile"
}

# Path to cached dump. Usage: cached <screen_name>
cached() {
  echo "$CACHE_DIR/${1}.json"
}

# Re-dump only if cache is stale (older than N seconds). Usage: dump_if_stale <screen_name> [max_age_seconds]
dump_if_stale() {
  local name="$1" max_age="${2:-10}"
  local file="$CACHE_DIR/${name}.json"
  if [ -f "$file" ]; then
    local age=$(( $(date +%s) - $(stat -f%m "$file" 2>/dev/null || stat -c%Y "$file" 2>/dev/null) ))
    if [ "$age" -lt "$max_age" ]; then
      echo "$file"
      return
    fi
  fi
  dump_ui "$name"
}

# ── Element Finding ──────────────────────────────────

# Find element center coords by regex match on label/text/name/identifier.
# Usage: find_el <cache_file> <search_regex>
# Returns "x,y" or empty if not found
find_el() {
  local file="$1" search="$2"
  jq -r --arg s "$search" '
    .data.elements[]
    | select(.label // .text // .name // .identifier | tostring | test($s; "i"))
    | "\(.rect.x + .rect.width/2 | floor),\(.rect.y + .rect.height/2 | floor)"
  ' "$file" 2>/dev/null | head -1
}

# Find element by exact text match. Usage: find_exact <cache_file> <text>
find_exact() {
  local file="$1" search="$2"
  jq -r --arg s "$search" '
    .data.elements[]
    | select((.label // "") == $s or (.text // "") == $s or (.name // "") == $s)
    | "\(.rect.x + .rect.width/2 | floor),\(.rect.y + .rect.height/2 | floor)"
  ' "$file" 2>/dev/null | head -1
}

# Check if text exists in cached dump. Usage: has_text <cache_file> <regex>
# Returns 0 (true) or 1 (false)
has_text() {
  local file="$1" search="$2"
  jq -e --arg s "$search" '
    [.data.elements[] | select(.label // .text // .name // "" | tostring | test($s; "i"))] | length > 0
  ' "$file" > /dev/null 2>&1
}

# Get all visible text from dump (preserves DOM order, deduped). Usage: all_text <cache_file>
all_text() {
  jq -r '.data.elements[] | [.label, .text, .name] | map(select(. != null and . != "")) | .[]' "$1" 2>/dev/null | awk '!seen[$0]++'
}

# Get element's y coordinate. Usage: el_y <cache_file> <search_regex>
el_y() {
  local file="$1" search="$2"
  jq -r --arg s "$search" '
    .data.elements[]
    | select(.label // .text // .name // .identifier | tostring | test($s; "i"))
    | (.rect.y + .rect.height/2 | floor)
  ' "$file" 2>/dev/null | head -1
}

# ── Waiting & Polling ────────────────────────────────

# Poll until text appears on screen. Usage: wait_for <regex> [timeout_s] [dump_name]
# Returns cached dump path on success, exits 1 on timeout
wait_for() {
  local text="$1" timeout="${2:-5}" name="${3:-_poll}"
  local tmpfile="$CACHE_DIR/${name}-tmp.json"
  local deadline=$(($(date +%s) + timeout))
  while true; do
    mobilecli dump ui --device "$DEVICE" > "$tmpfile" 2>/dev/null
    if has_text "$tmpfile" "$text"; then
      mv "$tmpfile" "$CACHE_DIR/${name}.json"
      echo "$CACHE_DIR/${name}.json"
      return 0
    fi
    [ "$(date +%s)" -ge "$deadline" ] && break
    sleep 0.5
  done
  mv "$tmpfile" "$CACHE_DIR/${name}.json"
  echo "$CACHE_DIR/${name}.json"
  return 1
}

# Poll until text disappears from screen. Usage: wait_until_gone <regex> [timeout_s] [dump_name]
wait_until_gone() {
  local text="$1" timeout="${2:-5}" name="${3:-_poll}"
  local tmpfile="$CACHE_DIR/${name}-tmp.json"
  local deadline=$(($(date +%s) + timeout))
  while true; do
    mobilecli dump ui --device "$DEVICE" > "$tmpfile" 2>/dev/null
    if ! has_text "$tmpfile" "$text"; then
      mv "$tmpfile" "$CACHE_DIR/${name}.json"
      echo "$CACHE_DIR/${name}.json"
      return 0
    fi
    [ "$(date +%s)" -ge "$deadline" ] && break
    sleep 0.5
  done
  mv "$tmpfile" "$CACHE_DIR/${name}.json"
  echo "$CACHE_DIR/${name}.json"
  return 1
}

# Quick screen identity check. Usage: on_screen <landmark_regex>
# Returns 0 if landmark found, 1 if not. Dumps fresh UI.
on_screen() {
  local f
  f=$(dump_ui "_screen_check")
  has_text "$f" "$1"
}

# ── Interactions ─────────────────────────────────────

# Tap coordinates. Usage: tap <x,y>
tap() {
  mobilecli io tap --device "$DEVICE" "$1"
}

# Tap and verify navigation. Usage: tap_and_verify <x,y> <expected_text> [dump_name]
# Returns dump path on success, exits 1 if expected text not found
tap_and_verify() {
  local xy="$1" expected="$2" name="${3:-after-tap}"
  tap "$xy"
  wait_for "$expected" 6 "$name"
}

# Long press. Usage: longpress <x,y> [duration_ms]
longpress() {
  local coords="$1" duration="${2:-}"
  if [ -n "$duration" ]; then
    mobilecli io longpress --device "$DEVICE" "$coords" --duration "$duration"
  else
    mobilecli io longpress --device "$DEVICE" "$coords"
  fi
}

# Type text into focused field. Usage: type_text <text>
type_text() {
  mobilecli io text --device "$DEVICE" "$1"
}

# ── Platform-aware text input ──────────────────────────
# Detects platform and uses the right strategy:
# - iOS: tap + type_text (standard)
# - Android: enable show_ime_with_hard_keyboard, tap, type via adb input text
#   (React Native Fabric TextInputs on Android don't open keyboard from
#    UIAutomator/ADB taps unless this setting is enabled)

_PLATFORM=""
_detect_platform() {
  if [ -n "$_PLATFORM" ]; then return; fi
  local info
  info=$(mobilecli device info --device "$DEVICE" 2>/dev/null)
  _PLATFORM=$(echo "$info" | jq -r '.data.device.platform // .data.platform // "unknown"' 2>/dev/null)
  if [ "$_PLATFORM" = "android" ]; then
    # Enable soft keyboard even when hardware keyboard events are detected
    adb -s "$DEVICE" shell "settings put secure show_ime_with_hard_keyboard 1" > /dev/null 2>&1
  fi
}

# Dismiss keyboard/focus. Taps BACK on Android (dismisses keyboard),
# then taps a neutral top-of-screen area to fully unfocus any TextInput.
# Usage: dismiss_focus
dismiss_focus() {
  _detect_platform
  if [ "$_PLATFORM" = "android" ]; then
    mobilecli io button --device "$DEVICE" BACK >/dev/null 2>&1
    sleep 0.3
  fi
  # Tap top-left neutral area (near screen title, away from inputs)
  tap "100,50" >/dev/null 2>&1
  sleep 0.2
}

# Tap an input field and type text. Handles Android RN TextInput quirks.
# Auto-dismisses focus after typing so UIAutomator dumps work again.
# Usage: fill_input <x,y> <text> [--no-dismiss]
fill_input() {
  local coords="$1" text="$2" no_dismiss="${3:-}"
  _detect_platform
  tap "$coords"
  sleep 0.5
  if [ "$_PLATFORM" = "android" ]; then
    # Encode special chars for adb input text: spaces→%s, quotes→escaped
    local encoded
    encoded=$(printf '%s' "$text" | sed 's/ /%s/g; s/"/\\"/g; s/'"'"'/\\'"'"'/g; s/&/\\&/g; s/(/\\(/g; s/)/\\)/g; s/</\\</g; s/>/\\>/g')
    adb -s "$DEVICE" shell "input text '$encoded'"
  else
    type_text "$text"
  fi
  # Auto-dismiss focus unless --no-dismiss is passed
  if [ "$no_dismiss" != "--no-dismiss" ]; then
    dismiss_focus
  fi
}

# Fresh dump + find element by regex + tap + type text.
# Usage: fill_by_label <regex> <text>
fill_by_label() {
  local search="$1" text="$2"
  local f coords
  f=$(dump_ui "_fill")
  coords=$(find_el "$f" "$search")
  if [ -z "$coords" ]; then
    echo "fill_by_label: '$search' not found" >&2
    return 1
  fi
  fill_input "$coords" "$text"
}

# Swipe. Usage: swipe_up / swipe_down / swipe <x1,y1,x2,y2>
swipe() {
  mobilecli io swipe --device "$DEVICE" "$1"
}

swipe_up() {
  mobilecli io swipe --device "$DEVICE" 200,600,200,200
}

swipe_down() {
  mobilecli io swipe --device "$DEVICE" 200,200,200,600
}

# ── Navigation ───────────────────────────────────────

# Navigate via deeplink. Usage: navigate <path> [landmark_text] [timeout_s]
# If landmark provided, polls for it instead of sleeping.
# Returns dump path when landmark found, or after fallback sleep.
navigate() {
  local route="$1" landmark="${2:-}" timeout="${3:-5}"
  mobilecli url --device "$DEVICE" "${DEEPLINK_SCHEME}://$route" > /dev/null 2>&1
  if [ -n "$landmark" ]; then
    wait_for "$landmark" "$timeout" "nav-${route:-home}"
  else
    sleep 0.5
  fi
}

# Back button. Usage: go_back [expected_landmark]
# WARNING: On Android at navigation root, BACK exits the app. Prefer deeplinks.
go_back() {
  mobilecli io button --device "$DEVICE" BACK
  if [ -n "${1:-}" ]; then
    wait_for "$1" 5 "after-back"
  else
    sleep 0.5
  fi
}

# Home button. Usage: go_home
go_home() {
  mobilecli io button --device "$DEVICE" HOME
  sleep 0.5
}

# ── App Lifecycle ────────────────────────────────────

# Launch app and poll until foreground. Usage: launch_app [timeout_s]
launch_app() {
  local timeout="${1:-10}"
  mobilecli apps launch --device "$DEVICE" "$APP_BUNDLE" > /dev/null 2>&1
  local i=0
  while [ "$i" -lt "$timeout" ]; do
    if check_foreground; then
      return 0
    fi
    sleep 0.5
    i=$((i + 1))
  done
  echo "WARNING: app not in foreground after ${timeout}s" >&2
  return 1
}

# Check app is in foreground. Usage: check_foreground
# Returns 0 if app is foreground, 1 if not
check_foreground() {
  local fg
  fg=$(mobilecli apps foreground --device "$DEVICE" 2>/dev/null)
  echo "$fg" | jq -e --arg b "$APP_BUNDLE" '.data.packageName == $b' > /dev/null 2>&1
}

# ── Auto-Dump One-Liners ────────────────────────────

# Fresh dump + all visible text. Replaces: dump_ui + all_text
# Usage: screen_text [name]
screen_text() {
  local name="${1:-_last}"
  local f
  f=$(dump_ui "$name")
  all_text "$f"
}

# Fresh dump + find element + tap + optional verify.
# Replaces: dump_ui + find_el + tap + wait_for
# Usage: tap_text <regex> [verify_regex] [name]
tap_text() {
  local search="$1" verify="${2:-}" name="${3:-_last}"
  local f coords
  f=$(dump_ui "$name")
  coords=$(find_el "$f" "$search")
  if [ -z "$coords" ]; then
    echo "tap_text: element matching '$search' not found" >&2
    return 1
  fi
  tap "$coords"
  if [ -n "$verify" ]; then
    wait_for "$verify" 6 "$name"
    return $?
  fi
  sleep 0.3
  return 0
}

# Fresh dump + assert landmark present. Prints diagnostic on failure.
# Usage: assert_screen <landmark> [msg]
assert_screen() {
  local landmark="$1" msg="${2:-Expected '$1' on screen}"
  local f
  f=$(dump_ui "_last")
  if has_text "$f" "$landmark"; then
    echo "OK: $msg"
    return 0
  else
    echo "FAIL: $msg" >&2
    echo "--- Actual screen text ---" >&2
    all_text "$f" >&2
    echo "--- End screen text ---" >&2
    return 1
  fi
}

# ── Element Inspection (Auto-Dump) ──────────────────

# Fresh dump + element details: type, bounds, center, text
# Usage: el_info <regex>
el_info() {
  local search="$1"
  local f
  f=$(dump_ui "_last")
  jq -r --arg s "$search" '
    .data.elements[]
    | select(.label // .text // .name // .identifier | tostring | test($s; "i"))
    | "type: \(.type // "unknown")\nbounds: \(.rect.x),\(.rect.y),\(.rect.width),\(.rect.height)\ncenter: \(.rect.x + .rect.width/2 | floor),\(.rect.y + .rect.height/2 | floor)\ntext: \(.label // .text // .name // "")"
  ' "$f" 2>/dev/null | head -4
}

# Fresh dump + list all interactive elements (buttons, inputs, switches, etc.) with coords
# Usage: clickable_els
clickable_els() {
  local f
  f=$(dump_ui "_last")
  jq -r '
    .data.elements[]
    | select(.type | test("Button|EditText|Switch|CheckBox|RadioButton|Spinner|SeekBar|Toggle|Clickable|Input|Picker"; "i"))
    | "\(.rect.x + .rect.width/2 | floor),\(.rect.y + .rect.height/2 | floor)  \(.type)  \(.label // .text // .name // .identifier // "(no label)")"
  ' "$f" 2>/dev/null
}

# Fresh dump + find all elements containing a point
# Usage: els_at <x> <y>
els_at() {
  local px="$1" py="$2"
  local f
  f=$(dump_ui "_last")
  els_at_point "$f" "$px" "$py"
}

# Fresh dump + find all elements within a rectangular region
# Usage: els_in_region <x1> <y1> <x2> <y2>
# Returns: type, bounds, center, and text for each element whose center falls within the region
els_in_region() {
  local x1="$1" y1="$2" x2="$3" y2="$4"
  local f
  f=$(dump_ui "_last")
  els_in_region_cached "$f" "$x1" "$y1" "$x2" "$y2"
}

# ── Cached Element Helpers ──────────────────────────

# Find element in cached dump + tap it. Replaces: find_el + tap as two lines
# Usage: tap_el <file> <regex>
tap_el() {
  local file="$1" search="$2"
  local coords
  coords=$(find_el "$file" "$search")
  if [ -z "$coords" ]; then
    echo "tap_el: element matching '$search' not found in $file" >&2
    return 1
  fi
  tap "$coords"
}

# Get element properties from cached dump (type, bounds, center, text)
# Usage: el_props <file> <regex>
el_props() {
  local file="$1" search="$2"
  jq -r --arg s "$search" '
    .data.elements[]
    | select(.label // .text // .name // .identifier | tostring | test($s; "i"))
    | "type: \(.type // "unknown")\nbounds: \(.rect.x),\(.rect.y),\(.rect.width),\(.rect.height)\ncenter: \(.rect.x + .rect.width/2 | floor),\(.rect.y + .rect.height/2 | floor)\ntext: \(.label // .text // .name // "")"
  ' "$file" 2>/dev/null | head -4
}

# Find all elements at a point in cached dump
# Usage: els_at_point <file> <x> <y>
els_at_point() {
  local file="$1" px="$2" py="$3"
  jq -r --argjson px "$px" --argjson py "$py" '
    .data.elements[]
    | select(.rect.x <= $px and ($px <= .rect.x + .rect.width) and .rect.y <= $py and ($py <= .rect.y + .rect.height))
    | "\(.type // "unknown")  \(.rect.x),\(.rect.y),\(.rect.width),\(.rect.height)  \(.label // .text // .name // "")"
  ' "$file" 2>/dev/null
}

# Find all elements within a rectangular region in cached dump
# Usage: els_in_region_cached <file> <x1> <y1> <x2> <y2>
# Matches elements whose center point falls within the region
els_in_region_cached() {
  local file="$1" x1="$2" y1="$3" x2="$4" y2="$5"
  jq -r --argjson x1 "$x1" --argjson y1 "$y1" --argjson x2 "$x2" --argjson y2 "$y2" '
    .data.elements[]
    | (.rect.x + .rect.width/2) as $cx | (.rect.y + .rect.height/2) as $cy
    | select($cx >= $x1 and $cx <= $x2 and $cy >= $y1 and $cy <= $y2)
    | "\(.type // "unknown")  \(.rect.x),\(.rect.y),\(.rect.width),\(.rect.height)  \(.label // .text // .name // "")"
  ' "$file" 2>/dev/null
}

# ── Reporting ────────────────────────────────────────

pass()  { echo "PASS  TEST $1: $2"; }
issue() { echo "ISSUE TEST $1: $2"; }
skip()  { echo "SKIP  TEST $1: $2"; }
