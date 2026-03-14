"""Screen dimension conversion between physical pixels and logical points.

iOS operates in point space where physical pixels equal points multiplied
by the device scale factor (e.g., 3x on iPhone Pro models). Android adb
uses pixel coordinates directly -- no conversion needed.
"""


def screen_logical_size(width_px, height_px, scale):
    """Convert full screen dimensions from physical pixels to logical points.

    Returns a (width, height) tuple in logical points, or None when scale
    is unavailable (e.g., shutdown simulators where getenv fails and the
    enumerate fallback does not report scale).
    """
    if not scale:
        return None
    return (round(width_px / scale), round(height_px / scale))
