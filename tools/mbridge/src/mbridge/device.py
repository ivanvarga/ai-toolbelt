import click

from mbridge.output import error


@click.group()
def device():
    """Manage connected devices."""
    pass


@device.command("list")
@click.option("--platform", type=click.Choice(["ios", "android"]), help="Filter by platform")
def list_devices(platform):
    """List connected iOS simulators and Android emulators."""
    error("not implemented")


@device.command()
@click.argument("device_id")
def boot(device_id):
    """Boot a device."""
    error("not implemented")


@device.command()
@click.argument("device_id")
def info(device_id):
    """Show extended device info including screen dimensions."""
    error("not implemented")
