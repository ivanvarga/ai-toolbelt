import click

from mbridge.output import error, output
from mbridge.platforms import android, ios


def _detect_platform(device_id):
    try:
        for dev in ios.list_devices():
            if dev["id"] == device_id:
                return "ios"
    except RuntimeError:
        pass
    try:
        for dev in android.list_devices():
            if dev["id"] == device_id:
                return "android"
    except RuntimeError:
        pass
    return None


@click.group()
def device():
    """Manage connected devices."""
    pass


@device.command("list")
@click.option("--platform", type=click.Choice(["ios", "android"]), help="Filter by platform")
@click.option("--available", is_flag=True, default=False, help="Include available but unbooted devices")
def list_devices(platform, available):
    """List connected iOS simulators and Android emulators."""
    devices = []

    if platform == "ios" or platform is None:
        try:
            devices.extend(
                _strip_internal(d) for d in ios.list_devices()
            )
        except RuntimeError as e:
            if platform == "ios":
                error(str(e))

    if platform == "android" or platform is None:
        try:
            devices.extend(android.list_devices())
        except RuntimeError as e:
            if platform == "android":
                error(str(e))

    if available:
        if platform == "android" or platform is None:
            try:
                running_ids = {d["id"] for d in devices if d.get("platform") == "android"}
                for avd in android.list_avds():
                    if avd["name"] not in running_ids:
                        devices.append(avd)
            except RuntimeError:
                pass

    output(devices)


@device.command()
@click.argument("device_id")
@click.option("--timeout", type=int, default=120, help="Boot timeout in seconds (Android only)")
def boot(device_id, timeout):
    """Boot a device (iOS simulator or Android emulator)."""
    ios_error = None
    try:
        result = ios.boot_device(device_id)
        output(result)
        return
    except RuntimeError as e:
        ios_error = e

    android_error = None
    try:
        avds = android.list_avds()
        avd_names = [a["name"] for a in avds]
        if device_id in avd_names:
            result = android.boot_emulator(device_id, timeout=timeout)
            output(result)
            return
    except RuntimeError as e:
        android_error = e

    if ios_error and android_error:
        error(f"Boot failed. iOS: {ios_error} | Android: {android_error}")
    elif ios_error:
        error(f"iOS boot failed: {ios_error}")
    elif android_error:
        error(f"Android boot failed: {android_error}")
    else:
        error(f"Device not found: {device_id}")


@device.command()
@click.argument("device_id")
def info(device_id):
    """Show extended device info including screen dimensions."""
    platform = _detect_platform(device_id)
    if platform == "ios":
        try:
            result = ios.get_device_info(device_id)
            result = _strip_internal(result)
            output(result)
            return
        except RuntimeError as e:
            error(str(e))
    elif platform == "android":
        try:
            result = android.get_device_info(device_id)
            output(result)
            return
        except RuntimeError as e:
            error(str(e))

    error(f"Device not found: {device_id}")


def _strip_internal(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}
