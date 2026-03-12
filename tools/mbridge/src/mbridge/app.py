import click

from mbridge.output import error


@click.group()
def app():
    """Manage applications."""
    pass


@app.command("list")
@click.argument("device_id")
def list_apps(device_id):
    """List installed apps on device."""
    error("not implemented")


@app.command()
@click.argument("device_id")
def foreground(device_id):
    """Show the foreground app."""
    error("not implemented")


@app.command()
@click.argument("device_id")
@click.argument("bundle_id")
def launch(device_id, bundle_id):
    """Launch an app by bundle ID."""
    error("not implemented")


@app.command("open-url")
@click.argument("device_id")
@click.argument("url")
def open_url(device_id, url):
    """Open a deeplink URL on device."""
    error("not implemented")
