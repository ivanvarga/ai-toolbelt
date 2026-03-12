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
def list_devices(platform):
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

    output(devices)


@device.command()
@click.argument("device_id")
def boot(device_id):
    """Boot a device."""
    try:
        result = ios.boot_device(device_id)
        output(result)
        return
    except RuntimeError:
        pass

    error(f"Device not found or boot not supported: {device_id}")


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
