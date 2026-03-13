"""Coordinate conversion between logical points and physical pixels.

iOS WDA and simctl operate in point space. Physical pixels equal points
multiplied by the device scale factor (e.g., 3x on iPhone Pro models).

Android adb input uses pixel coordinates from ``wm size`` (or the override
resolution if one is set). No conversion is needed on Android.

This module provides conversion functions. Callers decide which to use
based on the target platform.
"""


def logical_to_physical(x, y, scale):
    """Convert logical points to physical pixels.

    Used when translating touch coordinates from point space (as reported
    by WDA or accessibility frameworks) to raw pixel values.
    """
    return (round(x * scale), round(y * scale))


def physical_to_logical(x, y, scale):
    """Convert physical pixels to logical points.

    Used when translating screen pixel coordinates (e.g., from screenshot
    dimensions) back to the point space expected by simctl or WDA.
    """
    return (round(x / scale), round(y / scale))


def screen_logical_size(width_px, height_px, scale):
    """Convert full screen dimensions from physical pixels to logical points.

    Returns a (width, height) tuple in logical points, or None when scale
    is unavailable (e.g., shutdown simulators where getenv fails and the
    enumerate fallback does not report scale).
    """
    if not scale:
        return None
    return (round(width_px / scale), round(height_px / scale))
