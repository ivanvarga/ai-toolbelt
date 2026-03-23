import time

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


def _get_screen_logical(device_id):
    platform = _detect_platform(device_id)
    if platform == "ios":
        screen = ios._get_screen_info(device_id)
        scale = screen.get("scale", 1)
        return int(screen["width"] / scale), int(screen["height"] / scale)
    else:
        screen = android._get_screen_info(device_id)
        return screen["width"], screen["height"]


def _filter_visible(elements, screen_w, screen_h):
    return [
        e for e in elements
        if 0 <= e.get("center", {}).get("x", -1) <= screen_w
        and 0 <= e.get("center", {}).get("y", -1) <= screen_h
    ]


@ui.command()
@click.argument("device_id")
@click.option("--visible", is_flag=True, default=False, help="Only show elements visible on screen")
def dump(device_id, visible):
    """Dump normalized UI element tree."""
    try:
        elements = _capture_dump(device_id)
        if visible:
            sw, sh = _get_screen_logical(device_id)
            elements = _filter_visible(elements, sw, sh)
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
@click.option("--visible", is_flag=True, default=False, help="Only show elements visible on screen")
def find(device_id, element_id, text, exact, element_type, xpath, visible):
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
        if visible:
            sw, sh = _get_screen_logical(device_id)
            results = _filter_visible(results, sw, sh)
        output(results)
    except RuntimeError as e:
        error(str(e))


@ui.command("wait-for")
@click.argument("device_id")
@click.option("--text", default=None, help="Wait for element with matching text")
@click.option("--id", "element_id", default=None, help="Wait for element with matching accessibility ID")
@click.option("--type", "element_type", default=None, help="Wait for element with matching type")
@click.option("--exact", is_flag=True, default=False, help="Require exact text match")
@click.option("--timeout", type=float, default=10.0, help="Maximum wait time in seconds")
@click.option("--interval", type=float, default=0.5, help="Poll interval in seconds")
def wait_for(device_id, text, element_id, element_type, exact, timeout, interval):
    """Wait for an element to appear in the UI hierarchy."""
    if not text and not element_id and not element_type:
        error("Provide at least one query flag: --text, --id, or --type")

    deadline = time.monotonic() + timeout
    last_error = None

    while time.monotonic() < deadline:
        try:
            elements = _capture_dump(device_id)
            results = find_elements(
                elements, id=element_id, text=text, exact=exact,
                element_type=element_type,
            )
            if results:
                output(results[0])
                return
        except RuntimeError as e:
            last_error = str(e)

        remaining = deadline - time.monotonic()
        if remaining > 0:
            time.sleep(min(interval, remaining))

    if last_error:
        error(f"Timeout after {timeout}s waiting for element (last error: {last_error})")
    else:
        error(f"Timeout after {timeout}s waiting for element")
