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


REAL_DEVICE_MSG = (
    "iOS real devices are not supported. "
    "mbridge uses idb (Facebook iOS Development Bridge) for iOS automation, "
    "but idb-companion has not been updated since 2022 and does not work with iOS 17+. "
    "No maintained open-source tool provides iOS real device UI automation. "
    "Use an iOS simulator instead: mbridge device list --platform ios"
)


def _is_real_device(device_id):
    device = _find_device(device_id)
    return device is not None and device.get("type") == "device"


def _require_simulator(device_id):
    if _is_real_device(device_id):
        raise RuntimeError(REAL_DEVICE_MSG)


def _list_real_devices():
    try:
        result = subprocess.run(
            ["idb", "list-targets", "--json"],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            return []
        devices = []
        for line in result.stdout.strip().splitlines():
            target = json.loads(line)
            if target.get("type") == "device":
                devices.append({
                    "id": target["udid"],
                    "name": target.get("name", "Unknown"),
                    "platform": "ios",
                    "type": "device",
                    "state": target.get("state", "unknown").lower(),
                    "os_version": target.get("os_version", ""),
                })
        return devices
    except (RuntimeError, FileNotFoundError):
        return []


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
    devices.extend(_list_real_devices())
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
    _require_simulator(device_id)
    require_xcrun()
    try:
        run_cmd(["xcrun", "simctl", "boot", device_id])
    except RuntimeError as e:
        if "Booted" not in str(e) and "current state: Booted" not in str(e):
            raise
    return {"id": device_id, "status": "booted"}


def list_apps(device_id):
    _require_simulator(device_id)
    require_xcrun()
    simctl = subprocess.Popen(
        ["xcrun", "simctl", "listapps", device_id],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    plutil = subprocess.Popen(
        ["plutil", "-convert", "xml1", "-o", "-", "--", "-"],
        stdin=simctl.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    simctl.stdout.close()
    xml_data, plutil_err = plutil.communicate()
    simctl.wait()

    if simctl.returncode != 0:
        stderr_text = simctl.stderr.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(stderr_text or f"Failed to list apps on {device_id}")
    if plutil.returncode != 0:
        raise RuntimeError("Failed to convert app list plist")

    try:
        apps_plist = plistlib.loads(xml_data)
    except Exception:
        raise RuntimeError("Failed to parse app list output")

    entries = apps_plist.values() if isinstance(apps_plist, dict) else apps_plist
    apps = []
    for app_info in entries:
        apps.append({
            "bundle_id": app_info.get("CFBundleIdentifier", "unknown"),
            "name": app_info.get("CFBundleDisplayName")
                   or app_info.get("CFBundleName", "unknown"),
            "version": app_info.get("CFBundleShortVersionString", ""),
        })
    return apps


def get_foreground_app(device_id):
    _require_simulator(device_id)
    require_idb()
    raw = dump_ui(device_id)
    for node in raw:
        if isinstance(node, dict) and node.get("role") == "AXApplication":
            name = node.get("AXLabel", "unknown")
            bundle_id = None
            try:
                for a in list_apps(device_id):
                    if a.get("name") == name:
                        bundle_id = a["bundle_id"]
                        break
            except RuntimeError:
                pass
            result = {"name": name}
            if bundle_id:
                result["bundle_id"] = bundle_id
            return result

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
    _require_simulator(device_id)
    require_xcrun()
    run_cmd(["xcrun", "simctl", "launch", device_id, bundle_id])
    return {"id": device_id, "bundle_id": bundle_id, "status": "launched"}


def clear_app_data(device_id, bundle_id):
    _require_simulator(device_id)
    require_xcrun()
    try:
        run_cmd(["xcrun", "simctl", "terminate", device_id, bundle_id])
    except RuntimeError:
        pass
    run_cmd(["xcrun", "simctl", "privacy", device_id, "reset", "all", bundle_id])
    try:
        run_cmd(["xcrun", "simctl", "uninstall", device_id, bundle_id])
    except RuntimeError:
        pass
    return {"id": device_id, "bundle_id": bundle_id, "status": "cleared"}


def open_url(device_id, url):
    _require_simulator(device_id)
    require_xcrun()
    run_cmd(["xcrun", "simctl", "openurl", device_id, url])
    return {"id": device_id, "url": url, "status": "opened"}


def tap(device_id, x, y):
    _require_simulator(device_id)
    require_idb()
    run_cmd(["idb", "ui", "tap", str(x), str(y), "--udid", device_id])


def swipe(device_id, x_start, y_start, x_end, y_end, duration=0.3):
    _require_simulator(device_id)
    require_idb()
    run_cmd(["idb", "ui", "swipe", str(x_start), str(y_start), str(x_end), str(y_end), "--duration", str(duration), "--udid", device_id])


def type_text(device_id, text):
    _require_simulator(device_id)
    require_idb()
    run_cmd(["idb", "ui", "text", text, "--udid", device_id])


def key_press(device_id, key_code):
    _require_simulator(device_id)
    require_idb()
    run_cmd(["idb", "ui", "key", str(key_code), "--udid", device_id])


def screenshot(device_id, dest_path):
    _require_simulator(device_id)
    require_xcrun()
    run_cmd(["xcrun", "simctl", "io", device_id, "screenshot", dest_path])


def dump_ui(device_id):
    _require_simulator(device_id)
    require_idb()
    result = subprocess.run(
        ["idb", "ui", "describe-all", "--udid", device_id],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        if "FBAccessibilityCommands" in stderr or "protocol" in stderr.lower():
            raise RuntimeError(REAL_DEVICE_MSG)
        raise RuntimeError(stderr or "idb ui describe-all failed")
    return json.loads(result.stdout)
