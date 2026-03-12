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


def _call_platform(device_id, ios_fn, android_fn, *args):
    platform = _detect_platform(device_id)
    if platform == "ios":
        try:
            result = ios_fn(device_id, *args)
            output(result)
            return
        except RuntimeError as e:
            error(str(e))
    elif platform == "android":
        try:
            result = android_fn(device_id, *args)
            output(result)
            return
        except RuntimeError as e:
            error(str(e))
    error(f"Device not found: {device_id}")


@click.group()
def app():
    """Manage applications."""
    pass


@app.command("list")
@click.argument("device_id")
def list_apps(device_id):
    """List installed apps on device."""
    _call_platform(device_id, ios.list_apps, android.list_apps)


@app.command()
@click.argument("device_id")
def foreground(device_id):
    """Show the foreground app."""
    _call_platform(device_id, ios.get_foreground_app, android.get_foreground_app)


@app.command()
@click.argument("device_id")
@click.argument("bundle_id")
def launch(device_id, bundle_id):
    """Launch an app by bundle ID."""
    _call_platform(device_id, ios.launch_app, android.launch_app, bundle_id)


@app.command("open-url")
@click.argument("device_id")
@click.argument("url")
def open_url(device_id, url):
    """Open a deeplink URL on device."""
    _call_platform(device_id, ios.open_url, android.open_url, url)
