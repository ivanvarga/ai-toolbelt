import os
import re
import shutil
import subprocess
import time

SHELL_META_CHARS = r'&()<>|;*\"\'~`'


def _find_emulator():
    path = shutil.which("emulator")
    if path:
        return path
    android_home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if android_home:
        candidate = os.path.join(android_home, "emulator", "emulator")
        if os.path.isfile(candidate):
            return candidate
    return None


def require_emulator():
    path = _find_emulator()
    if not path:
        raise RuntimeError(
            "Android emulator not found. Install via Android Studio SDK Manager "
            "or set ANDROID_HOME environment variable."
        )
    return path


def _parse_emulator_version(emulator_path):
    result = subprocess.run([emulator_path, "-version"], capture_output=True, text=True)
    match = re.search(r"Android emulator version (\d+)\.(\d+)\.(\d+)", result.stdout)
    if not match:
        return None
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


def list_avds():
    emulator_path = require_emulator()
    result = subprocess.run(
        [emulator_path, "-list-avds"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return []
    avds = []
    for line in result.stdout.strip().splitlines():
        name = line.strip()
        if name:
            avds.append({
                "name": name,
                "platform": "android",
                "type": "emulator",
                "state": "available",
            })
    return avds


def _launch_emulator(emulator_path, avd_name, gpu_mode):
    proc = subprocess.Popen(
        [emulator_path, "-avd", avd_name, "-gpu", gpu_mode],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    return proc


def _wait_for_process_stable(proc, seconds=5):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            return False
        time.sleep(0.5)
    return True


def _get_emulator_serials():
    try:
        result = subprocess.run(
            ["adb", "devices"], capture_output=True, text=True, timeout=5,
        )
        serials = set()
        for line in result.stdout.splitlines()[1:]:
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0].startswith("emulator-"):
                serials.add(parts[0])
        return serials
    except (subprocess.TimeoutExpired, RuntimeError):
        return set()


def _wait_for_boot(device_serial, timeout):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            result = subprocess.run(
                ["adb", "-s", device_serial, "shell", "getprop", "sys.boot_completed"],
                capture_output=True, text=True, timeout=5,
            )
            if result.stdout.strip() == "1":
                return True
        except (subprocess.TimeoutExpired, RuntimeError):
            pass
        time.sleep(2)
    return False


def boot_emulator(avd_name, timeout=120):
    emulator_path = require_emulator()
    version = _parse_emulator_version(emulator_path)
    if not version or version < (36, 0, 0):
        raise RuntimeError(
            f"Android emulator 36.0.0+ required "
            f"(found {'.'.join(map(str, version)) if version else 'unknown'}). "
            "Update via Android Studio SDK Manager."
        )

    before = _get_emulator_serials()
    deadline = time.monotonic() + timeout

    gpu_mode = "host"
    proc = _launch_emulator(emulator_path, avd_name, gpu_mode)
    if not _wait_for_process_stable(proc, seconds=5):
        gpu_mode = "software"
        proc = _launch_emulator(emulator_path, avd_name, gpu_mode)
        if not _wait_for_process_stable(proc, seconds=5):
            raise RuntimeError(
                "Emulator failed to start with both host and software GPU modes"
            )

    device_serial = None
    while time.monotonic() < deadline:
        new_serials = _get_emulator_serials() - before
        if new_serials:
            device_serial = new_serials.pop()
            break
        time.sleep(2)

    if not device_serial:
        raise RuntimeError("Emulator started but no adb device detected")

    remaining = max(1, deadline - time.monotonic())
    booted = _wait_for_boot(device_serial, remaining)

    result = {
        "id": device_serial,
        "status": "booted" if booted else "timeout",
        "gpu_mode": gpu_mode,
    }
    if gpu_mode == "software":
        result["note"] = "Hardware GPU unavailable, using software rendering (slower)"
    if not booted:
        raise RuntimeError(
            f"Emulator boot timed out after {timeout}s (left running)"
        )
    return result


def require_adb():
    if not shutil.which("adb"):
        raise RuntimeError(
            "adb not found. Install Android SDK Platform-Tools: "
            "https://developer.android.com/tools/releases/platform-tools"
        )


def run_cmd(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Command failed: {' '.join(args)}")
    return result


def list_devices():
    require_adb()
    result = run_cmd(["adb", "devices", "-l"])
    devices = []
    for line in result.stdout.splitlines()[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        serial = parts[0]
        status = parts[1]
        if status == "offline":
            continue

        props = {}
        for part in parts[2:]:
            if ":" in part:
                k, v = part.split(":", 1)
                props[k] = v

        device_type = "emulator" if re.match(r"emulator-\d+", serial) else "physical"
        model = props.get("model", _getprop(serial, "ro.product.model"))
        os_version = _getprop(serial, "ro.build.version.release")

        devices.append({
            "id": serial,
            "name": model,
            "platform": "android",
            "type": device_type,
            "state": "booted",
            "os_version": os_version,
        })
    return devices


def _getprop(serial, prop):
    try:
        result = run_cmd(["adb", "-s", serial, "shell", "getprop", prop])
        return result.stdout.strip()
    except RuntimeError:
        return ""


def get_device_info(device_id):
    require_adb()
    device = _find_device(device_id)
    if not device:
        raise RuntimeError(f"Android device not found: {device_id}")

    screen = _get_screen_info(device_id)
    architecture = _getprop(device_id, "ro.product.cpu.abi")
    sdk_version = _getprop(device_id, "ro.build.version.sdk")

    device["screen"] = screen
    device["architecture"] = architecture
    device["sdk_version"] = sdk_version
    return device


def _find_device(device_id):
    for dev in list_devices():
        if dev["id"] == device_id:
            return dev
    return None


def _get_screen_info(device_id):
    screen = {"width": None, "height": None, "density": None}

    try:
        result = run_cmd(["adb", "-s", device_id, "shell", "wm", "size"])
        for line in result.stdout.splitlines():
            match = re.search(r"(\d+)x(\d+)", line)
            if match:
                if "Override" in line:
                    screen["width"] = int(match.group(1))
                    screen["height"] = int(match.group(2))
                elif screen["width"] is None:
                    screen["width"] = int(match.group(1))
                    screen["height"] = int(match.group(2))
    except RuntimeError:
        pass

    try:
        result = run_cmd(["adb", "-s", device_id, "shell", "wm", "density"])
        for line in result.stdout.splitlines():
            match = re.search(r"(\d+)", line)
            if match:
                if "Override" in line:
                    screen["density"] = int(match.group(1))
                elif screen["density"] is None:
                    screen["density"] = int(match.group(1))
    except RuntimeError:
        pass

    return screen


def list_apps(device_id):
    require_adb()
    result = run_cmd(["adb", "-s", device_id, "shell", "pm", "list", "packages", "-3"])
    apps = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if line.startswith("package:"):
            apps.append({"bundle_id": line[len("package:"):]})
    return apps


def get_foreground_app(device_id):
    require_adb()
    try:
        result = run_cmd([
            "adb", "-s", device_id, "shell",
            "dumpsys", "activity", "activities",
        ])
        for line in result.stdout.splitlines():
            if "mResumedActivity" in line:
                match = re.search(r"u0\s+([^\s/]+)/", line)
                if match:
                    return {"bundle_id": match.group(1)}
    except RuntimeError:
        pass

    try:
        result = run_cmd([
            "adb", "-s", device_id, "shell",
            "dumpsys", "window",
        ])
        for line in result.stdout.splitlines():
            if "mCurrentFocus" in line:
                match = re.search(r"(\S+)/\S+\}", line)
                if match:
                    return {"bundle_id": match.group(1)}
    except RuntimeError:
        pass

    raise RuntimeError("Could not determine foreground app")


def launch_app(device_id, bundle_id):
    require_adb()
    run_cmd([
        "adb", "-s", device_id, "shell",
        "monkey", "-p", bundle_id, "-c", "android.intent.category.LAUNCHER", "1",
    ])
    return {"id": device_id, "bundle_id": bundle_id, "status": "launched"}


def clear_app_data(device_id, bundle_id):
    require_adb()
    run_cmd(["adb", "-s", device_id, "shell", "pm", "clear", bundle_id])
    return {"id": device_id, "bundle_id": bundle_id, "status": "cleared"}


def open_url(device_id, url):
    require_adb()
    run_cmd([
        "adb", "-s", device_id, "shell",
        "am", "start", "-a", "android.intent.action.VIEW", "-d", url,
    ])
    return {"id": device_id, "url": url, "status": "opened"}


def tap(device_id, x, y):
    require_adb()
    run_cmd(["adb", "-s", device_id, "shell", "input", "tap", str(x), str(y)])


def swipe(device_id, x_start, y_start, x_end, y_end, duration_ms=300):
    require_adb()
    run_cmd([
        "adb", "-s", device_id, "shell", "input", "swipe",
        str(x_start), str(y_start), str(x_end), str(y_end), str(duration_ms),
    ])


def _encode_adb_text(text):
    encoded = text.replace("%", "%%")
    encoded = encoded.replace(" ", "%s")
    result = []
    for ch in encoded:
        if ch in SHELL_META_CHARS:
            result.append("\\" + ch)
        else:
            result.append(ch)
    return "".join(result)


def type_text(device_id, text):
    require_adb()
    encoded = _encode_adb_text(text)
    run_cmd(["adb", "-s", device_id, "shell", "input", "text", encoded])


def keyevent(device_id, keycode):
    require_adb()
    run_cmd(["adb", "-s", device_id, "shell", "input", "keyevent", str(keycode)])


def screenshot_bytes(device_id):
    require_adb()
    result = subprocess.run(
        ["adb", "-s", device_id, "exec-out", "screencap", "-p"],
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.decode("utf-8", errors="replace").strip()
            or "screencap failed"
        )
    return result.stdout


def dump_ui(device_id):
    require_adb()
    result = subprocess.run(
        ["adb", "-s", device_id, "exec-out", "uiautomator", "dump", "/dev/tty"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "uiautomator dump failed")
    return result.stdout
