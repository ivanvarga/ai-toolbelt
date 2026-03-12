---
name: mobile-reset
description: Use when resetting app data on a connected iOS simulator or Android emulator, clearing app state, or starting fresh without reinstalling
---

# Reset App Data

Reset app data on a connected iOS simulator or Android emulator without uninstalling.

## Steps

### 1. Detect Available Devices

For iOS simulators:

```bash
xcrun simctl list devices | grep -i booted
```

For Android devices/emulators:

```bash
adb devices | grep -v "List of devices"
```

### 2. Parse Bundle and Package Identifiers

Read the current project's config file (`app.config.ts`, `app.json`, or similar Expo/React Native config) to find:
- iOS: `bundleIdentifier` values for each environment
- Android: `package` values for each environment
- Map environment names (develop, staging, production) to their identifiers

Do NOT hardcode any bundle IDs or package names -- always read from the project config.

### 3. Ask User to Select Environment

Present available environments found in config (e.g., "develop", "staging", "production"). Show the bundle/package ID for each so the user can confirm.

### 4. Ask User to Select Device

If multiple devices are available (iOS or Android), let the user choose which device to reset.

If only one device is booted/connected, use it automatically.

### 5. Execute Reset

For iOS simulator:

```bash
xcrun simctl privacy <UDID> reset all <bundle.identifier>
```

For Android:

```bash
adb -s <device_id> shell pm clear <package.name>
```

### 6. Report Result

Confirm success or show the error message if the reset command failed.
