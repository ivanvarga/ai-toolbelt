import time

import click

from mbridge.device import _detect_platform
from mbridge.output import error, output
from mbridge.parsing.query import find_elements
from mbridge.platforms import android, ios
from mbridge.ui import _capture_dump

IOS_KEY_MAP = {"\n": 40, "\b": 42, "\t": 43, "\x1b": 41}
ANDROID_KEY_MAP = {"\n": 66, "\b": 67, "\t": 61, "\x1b": 111}

ESCAPE_MAP = {"n": "\n", "b": "\b", "t": "\t", "e": "\x1b"}


def _dismiss_android_keyboard(device_id):
    try:
        result = android.run_cmd([
            "adb", "-s", device_id, "shell",
            "dumpsys", "input_method",
        ])
        if "mInputShown=true" in result.stdout:
            android.keyevent(device_id, 4)
    except RuntimeError:
        pass


def _resolve_element(device_id, text=None, element_id=None, element_type=None,
                     exact=False, unique=False):
    elements = _capture_dump(device_id)
    results = find_elements(
        elements, id=element_id, text=text, exact=exact, element_type=element_type,
    )
    if not results:
        error("No matching elements found")
    if unique and len(results) > 1:
        descriptions = [
            f"  {r.get('type', '?')} \"{r.get('label', '')}\" at ({r['center']['x']}, {r['center']['y']})"
            for r in results
        ]
        error(f"Multiple matches found ({len(results)}):\n" + "\n".join(descriptions))
    return results[0]


def _parse_text_segments(text):
    segments = []
    i = 0
    current = []
    while i < len(text):
        if text[i] == "\\" and i + 1 < len(text) and text[i + 1] in ESCAPE_MAP:
            if current:
                segments.append(("text", "".join(current)))
                current = []
            segments.append(("key", ESCAPE_MAP[text[i + 1]]))
            i += 2
        else:
            current.append(text[i])
            i += 1
    if current:
        segments.append(("text", "".join(current)))
    return segments


def compute_swipe_coords(screen_width, screen_height, direction, distance_pct=0.5,
                         start_x=None, start_y=None):
    sx = start_x if start_x is not None else screen_width // 2
    sy = start_y if start_y is not None else screen_height // 2

    ex, ey = sx, sy
    if direction == "up":
        ey = sy - int(screen_height * distance_pct)
    elif direction == "down":
        ey = sy + int(screen_height * distance_pct)
    elif direction == "left":
        ex = sx - int(screen_width * distance_pct)
    elif direction == "right":
        ex = sx + int(screen_width * distance_pct)

    ex = max(0, min(ex, screen_width))
    ey = max(0, min(ey, screen_height))
    return (sx, sy, ex, ey)


@click.group()
def action():
    """Interact with device UI."""
    pass


@action.command()
@click.argument("device_id")
@click.option("--x", type=int, default=None, help="X coordinate")
@click.option("--y", type=int, default=None, help="Y coordinate")
@click.option("--text", default=None, help="Find element by text")
@click.option("--id", "element_id", default=None, help="Find element by accessibility ID")
@click.option("--type", "element_type", default=None, help="Find element by type")
@click.option("--exact", is_flag=True, default=False, help="Require exact text match")
@click.option("--unique", is_flag=True, default=False, help="Fail if multiple matches")
def tap(device_id, x, y, text, element_id, element_type, exact, unique):
    """Tap at coordinates or on an element."""
    try:
        if text or element_id or element_type:
            el = _resolve_element(device_id, text=text, element_id=element_id,
                                  element_type=element_type, exact=exact, unique=unique)
            x, y = el["center"]["x"], el["center"]["y"]
        elif x is None or y is None:
            error("Provide --x/--y coordinates or element targeting flags (--text, --id, --type)")

        platform = _detect_platform(device_id)
        if platform == "ios":
            ios.tap(device_id, x, y)
        elif platform == "android":
            android.tap(device_id, x, y)
        else:
            error(f"Device not found: {device_id}")

        output({"status": "tapped", "x": x, "y": y})
    except RuntimeError as e:
        error(str(e))


@action.command()
@click.argument("device_id")
@click.argument("direction", type=click.Choice(["up", "down", "left", "right"]))
@click.option("--distance", type=float, default=0.5, help="Swipe distance as screen fraction")
@click.option("--text", default=None, help="Find element by text (swipe from element)")
@click.option("--id", "element_id", default=None, help="Find element by accessibility ID")
@click.option("--type", "element_type", default=None, help="Find element by type")
@click.option("--exact", is_flag=True, default=False, help="Require exact text match")
@click.option("--from", "from_coords", default=None, help="Start coordinates as 'x,y'")
def swipe(device_id, direction, distance, text, element_id, element_type, exact, from_coords):
    """Swipe in a direction from screen center, element, or coordinates."""
    try:
        platform = _detect_platform(device_id)
        if not platform:
            error(f"Device not found: {device_id}")

        screen = _get_logical_screen(device_id, platform)

        start_x, start_y = None, None
        if text or element_id or element_type:
            el = _resolve_element(device_id, text=text, element_id=element_id,
                                  element_type=element_type, exact=exact)
            start_x, start_y = el["center"]["x"], el["center"]["y"]
        elif from_coords:
            parts = from_coords.split(",")
            start_x, start_y = int(parts[0]), int(parts[1])

        x1, y1, x2, y2 = compute_swipe_coords(
            screen["width"], screen["height"], direction,
            distance_pct=distance, start_x=start_x, start_y=start_y,
        )

        if platform == "ios":
            ios.swipe(device_id, x1, y1, x2, y2)
        else:
            android.swipe(device_id, x1, y1, x2, y2)

        output({
            "status": "swiped",
            "direction": direction,
            "from": {"x": x1, "y": y1},
            "to": {"x": x2, "y": y2},
        })
    except RuntimeError as e:
        error(str(e))


def _get_logical_screen(device_id, platform):
    if platform == "ios":
        screen = ios._get_screen_info(device_id)
        if screen.get("scale"):
            screen["width"] = int(screen["width"] / screen["scale"])
            screen["height"] = int(screen["height"] / screen["scale"])
    else:
        screen = android._get_screen_info(device_id)
    return screen


def _perform_swipe(device_id, platform, screen, direction, distance_pct=0.3):
    x1, y1, x2, y2 = compute_swipe_coords(
        screen["width"], screen["height"], direction, distance_pct=distance_pct,
    )
    if platform == "ios":
        ios.swipe(device_id, x1, y1, x2, y2)
    else:
        android.swipe(device_id, x1, y1, x2, y2)


def _is_on_screen(element, screen_width, screen_height):
    cy = element.get("center", {}).get("y")
    cx = element.get("center", {}).get("x")
    if cy is None or cx is None:
        return False
    return 0 <= cx <= screen_width and 0 <= cy <= screen_height


def _find_visible(elements, screen, **query):
    results = find_elements(elements, **query)
    return [r for r in results if _is_on_screen(r, screen["width"], screen["height"])]


@action.command("swipe-to")
@click.argument("device_id")
@click.option("--text", default=None, help="Target element text to find")
@click.option("--id", "element_id", default=None, help="Target element accessibility ID")
@click.option("--type", "element_type", default=None, help="Target element type")
@click.option("--exact", is_flag=True, default=False, help="Require exact text match")
@click.option("--direction", type=click.Choice(["up", "down", "left", "right"]), default="up", help="Swipe direction")
@click.option("--distance", type=float, default=0.3, help="Swipe distance per step as screen fraction")
@click.option("--max-swipes", type=int, default=10, help="Maximum swipe attempts")
@click.option("--pause", type=float, default=0.2, help="Pause between swipes for UI to settle")
def swipe_to(device_id, text, element_id, element_type, exact, direction, distance, max_swipes, pause):
    """Swipe until a target element is visible on screen."""
    if not text and not element_id and not element_type:
        error("Provide at least one target: --text, --id, or --type")

    try:
        platform = _detect_platform(device_id)
        if not platform:
            error(f"Device not found: {device_id}")

        screen = _get_logical_screen(device_id, platform)
        query = dict(id=element_id, text=text, exact=exact, element_type=element_type)

        elements = _capture_dump(device_id)
        visible = _find_visible(elements, screen, **query)
        if visible:
            output({"status": "found", "swipes": 0, "element": visible[0]})
            return

        for i in range(max_swipes):
            _perform_swipe(device_id, platform, screen, direction, distance)
            time.sleep(pause)

            elements = _capture_dump(device_id)
            visible = _find_visible(elements, screen, **query)
            if visible:
                output({"status": "found", "swipes": i + 1, "element": visible[0]})
                return

        error(f"Element not found after {max_swipes} swipes")
    except RuntimeError as e:
        error(str(e))


@action.command("type")
@click.argument("device_id")
@click.argument("text")
@click.option("--text", "element_text", default=None, help="Find element by text (tap before typing)")
@click.option("--id", "element_id", default=None, help="Find element by accessibility ID")
@click.option("--type", "element_type", default=None, help="Find element by type")
@click.option("--exact", is_flag=True, default=False, help="Require exact text match")
@click.option("--clear", is_flag=True, default=False, help="Clear field before typing")
def type_text_cmd(device_id, text, element_text, element_id, element_type, exact, clear):
    """Type text with optional element targeting and escape sequences."""
    try:
        platform = _detect_platform(device_id)
        if not platform:
            error(f"Device not found: {device_id}")

        if element_text or element_id or element_type:
            el = _resolve_element(device_id, text=element_text, element_id=element_id,
                                  element_type=element_type, exact=exact)
            cx, cy = el["center"]["x"], el["center"]["y"]
            if platform == "ios":
                ios.tap(device_id, cx, cy)
            else:
                android.tap(device_id, cx, cy)

        if clear:
            if platform == "ios":
                from mbridge.platforms.ios import run_cmd
                run_cmd(["idb", "ui", "key-sequence"] + ["42"] * 200 + ["--udid", device_id])
            else:
                android.keyevent(device_id, 123)
                from mbridge.platforms.android import run_cmd as adb_run
                adb_run(["adb", "-s", device_id, "shell", "input", "keyevent"] + ["67"] * 200)

        key_map = IOS_KEY_MAP if platform == "ios" else ANDROID_KEY_MAP
        segments = _parse_text_segments(text)
        for seg_type, seg_value in segments:
            if seg_type == "text":
                if platform == "ios":
                    ios.type_text(device_id, seg_value)
                else:
                    android.type_text(device_id, seg_value)
            elif seg_type == "key":
                code = key_map[seg_value]
                if platform == "ios":
                    ios.key_press(device_id, code)
                else:
                    android.keyevent(device_id, code)

        if platform == "android":
            _dismiss_android_keyboard(device_id)

        output({"status": "typed", "text": text})
    except RuntimeError as e:
        error(str(e))
