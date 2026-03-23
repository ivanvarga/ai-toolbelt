import click

from mbridge.device import _detect_platform
from mbridge.ocr import ocr_screenshot
from mbridge.output import error, output


@click.group("verify")
def verify_group():
    """Verify device UI state."""
    pass


@verify_group.command()
@click.argument("device_id")
def ocr(device_id):
    """Extract all visible text from screen via OCR."""
    platform = _detect_platform(device_id)
    if platform is None:
        error(f"Device not found: {device_id}")

    try:
        ocr_text = ocr_screenshot(device_id, platform)
    except RuntimeError as e:
        error(str(e))

    output({"text": ocr_text})


@verify_group.command()
@click.argument("device_id")
@click.argument("expected")
@click.option("--exact", is_flag=True, default=False, help="Require exact match")
def text(device_id, expected, exact):
    """Verify expected text is visible on screen via OCR."""
    platform = _detect_platform(device_id)
    if platform is None:
        error(f"Device not found: {device_id}")

    try:
        ocr_text = ocr_screenshot(device_id, platform)
    except RuntimeError as e:
        error(str(e))

    if exact:
        if ocr_text.strip() == expected:
            output({"found": True, "text": expected})
        else:
            output({"found": False, "expected": expected, "ocr_text": ocr_text})
    else:
        if expected in ocr_text:
            output({"found": True, "text": expected})
        else:
            output({"found": False, "expected": expected, "ocr_text": ocr_text})
