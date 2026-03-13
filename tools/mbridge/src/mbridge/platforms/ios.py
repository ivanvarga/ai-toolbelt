import json
import plistlib
import re
import shutil
import subprocess

from mbridge.coords import screen_logical_size


def require_xcrun():
    if not shutil.which("xcrun"):
        raise RuntimeError(
            "xcrun not found. Install Xcode Command Line Tools: xcode-select --install"
        )


def require_idb():
    if not shutil.which("idb"):
        raise RuntimeError(
            "idb not found. Install: brew tap facebook/fb && brew install idb-companion"
        )


def run_cmd(args, parse_json=False):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Command failed: {' '.join(args)}")
    if parse_json:
        return json.loads(result.stdout)
    return result


def list_devices():
    require_xcrun()
    data = run_cmd(["xcrun", "simctl", "list", "devices", "--json"], parse_json=True)
    devices = []
    for runtime_key, runtime_devices in data.get("devices", {}).items():
        os_version = _parse_runtime(runtime_key)
        for dev in runtime_devices:
            if not dev.get("isAvailable", False):
                continue
            devices.append({
                "id": dev["udid"],
                "name": dev["name"],
                "platform": "ios",
                "type": "simulator",
                "state": dev.get("state", "unknown").lower(),
                "os_version": os_version,
                "_deviceTypeIdentifier": dev.get("deviceTypeIdentifier", ""),
                "_dataPath": dev.get("dataPath", ""),
            })
    return devices


def _parse_runtime(runtime_key):
    match = re.search(r"\.([a-zA-Z]+)-(\d+(?:-\d+)*)$", runtime_key)
    if not match:
        return runtime_key
    platform_prefix = match.group(1)
    version = match.group(2).replace("-", ".")
    return f"{platform_prefix} {version}"


def get_device_info(device_id):
    require_xcrun()
    device = _find_device(device_id)
    if not device:
        raise RuntimeError(f"iOS device not found: {device_id}")

    screen = _get_screen_info(device_id)
    logical = screen_logical_size(screen["width"], screen["height"], screen["scale"])
    if logical:
        screen["logical_width"], screen["logical_height"] = logical
    base = {k: v for k, v in device.items() if not k.startswith("_")}
    base["screen"] = screen
    base["architecture"] = "arm64"
    base["runtime_version"] = device.get("os_version", "")
    base["data_path"] = device.get("_dataPath", "")
    return base


def _find_device(device_id):
    for dev in list_devices():
        if dev["id"] == device_id:
            return dev
    return None


def _get_screen_info(device_id):
    screen = {"width": None, "height": None, "scale": None}

    try:
        w = run_cmd(["xcrun", "simctl", "getenv", device_id, "SIMULATOR_MAINSCREEN_WIDTH"])
        h = run_cmd(["xcrun", "simctl", "getenv", device_id, "SIMULATOR_MAINSCREEN_HEIGHT"])
        s = run_cmd(["xcrun", "simctl", "getenv", device_id, "SIMULATOR_MAINSCREEN_SCALE"])
        screen["width"] = int(w.stdout.strip())
        screen["height"] = int(h.stdout.strip())
        screen["scale"] = float(s.stdout.strip())
        return screen
    except (RuntimeError, ValueError):
        pass

    try:
        result = run_cmd(["xcrun", "simctl", "io", device_id, "enumerate"])
        for line in result.stdout.splitlines():
            if "Default width:" in line:
                match = re.search(r"Default width:\s*(\d+)", line)
                if match:
                    screen["width"] = int(match.group(1))
            if "Default height:" in line:
                match = re.search(r"Default height:\s*(\d+)", line)
                if match:
                    screen["height"] = int(match.group(1))
    except RuntimeError:
        pass

    return screen


def boot_device(device_id):
    require_xcrun()
    try:
        run_cmd(["xcrun", "simctl", "boot", device_id])
    except RuntimeError as e:
        if "Booted" not in str(e) and "current state: Booted" not in str(e):
            raise
    return {"id": device_id, "status": "booted"}


def list_apps(device_id):
    require_xcrun()
    result = subprocess.run(
        ["xcrun", "simctl", "listapps", device_id],
        capture_output=True,
    )
    if result.returncode != 0:
        stderr_text = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(stderr_text or f"Failed to list apps on {device_id}")

    try:
        apps_plist = plistlib.loads(result.stdout)
    except Exception:
        raise RuntimeError("Failed to parse app list output")

    apps = []
    for app_info in apps_plist:
        apps.append({
            "bundle_id": app_info.get("CFBundleIdentifier", "unknown"),
            "name": app_info.get("CFBundleDisplayName")
                   or app_info.get("CFBundleName", "unknown"),
            "version": app_info.get("CFBundleShortVersionString", ""),
        })
    return apps


def get_foreground_app(device_id):
    require_xcrun()
    try:
        result = run_cmd([
            "xcrun", "simctl", "spawn", device_id, "launchctl", "list",
        ])
        for line in result.stdout.splitlines():
            if "UIKitApplication:" in line:
                match = re.search(r"UIKitApplication:([^\[]+)", line)
                if match:
                    bundle_id = match.group(1).strip()
                    return {"bundle_id": bundle_id}
    except RuntimeError:
        pass
    raise RuntimeError(
        "Could not determine foreground app. Device may not be booted or no app is active."
    )


def launch_app(device_id, bundle_id):
    require_xcrun()
    run_cmd(["xcrun", "simctl", "launch", device_id, bundle_id])
    return {"id": device_id, "bundle_id": bundle_id, "status": "launched"}


def open_url(device_id, url):
    require_xcrun()
    run_cmd(["xcrun", "simctl", "openurl", device_id, url])
    return {"id": device_id, "url": url, "status": "opened"}


def dump_ui(device_id):
    require_idb()
    result = subprocess.run(
        ["idb", "ui", "describe-all", "--udid", device_id],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "idb ui describe-all failed")
    return json.loads(result.stdout)
