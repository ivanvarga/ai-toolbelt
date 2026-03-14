import click

from mbridge import __version__
from mbridge.action import action
from mbridge.app import app
from mbridge.device import device
from mbridge.ui import ui
from mbridge.verify import verify_group


@click.group()
@click.version_option(version=__version__, prog_name="mbridge")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
@click.pass_context
def cli(ctx, verbose):
    """Mobile device bridge CLI."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose


cli.add_command(device)
cli.add_command(app)
cli.add_command(action)
cli.add_command(verify_group)
cli.add_command(ui)
