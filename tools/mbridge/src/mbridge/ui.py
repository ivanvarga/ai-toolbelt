import click

from mbridge.device import _detect_platform
from mbridge.output import error, output
from mbridge.parsing.android_parser import parse_android_dump
from mbridge.parsing.ios_parser import parse_ios_dump
from mbridge.parsing.query import find_elements
from mbridge.platforms import android, ios


@click.group()
def ui():
    """UI hierarchy operations."""
    pass


def _capture_dump(device_id):
    platform = _detect_platform(device_id)
    if platform == "ios":
        raw = ios.dump_ui(device_id)
        screen = ios._get_screen_info(device_id)
        return parse_ios_dump(raw, screen["width"], screen["height"])
    elif platform == "android":
        raw = android.dump_ui(device_id)
        screen = android._get_screen_info(device_id)
        return parse_android_dump(raw, screen["width"], screen["height"])
    else:
        error(f"Device not found: {device_id}")


@ui.command()
@click.argument("device_id")
def dump(device_id):
    """Dump normalized UI element tree."""
    try:
        elements = _capture_dump(device_id)
        output(elements)
    except RuntimeError as e:
        error(str(e))


@ui.command()
@click.argument("device_id")
@click.option("--id", "element_id", default=None, help="Filter by accessibility ID")
@click.option("--text", default=None, help="Filter by text content (substring match)")
@click.option("--exact", is_flag=True, default=False, help="Require exact text match")
@click.option("--type", "element_type", default=None, help="Filter by element type")
@click.option("--xpath", default=None, help="Filter by XPath expression")
def find(device_id, element_id, text, exact, element_type, xpath):
    """Find elements in the UI hierarchy."""
    try:
        elements = _capture_dump(device_id)
        results = find_elements(
            elements,
            id=element_id,
            text=text,
            exact=exact,
            element_type=element_type,
            xpath=xpath,
        )
        output(results)
    except RuntimeError as e:
        error(str(e))
