from mbridge.parsing.normalize import (
    IOS_TYPE_MAP,
    compute_center,
    is_visible,
    normalize_type,
)


def parse_ios_dump(elements, screen_width=390, screen_height=844):
    result = []
    for el in elements:
        frame = el.get("frame")
        if not frame:
            continue
        bounds = {
            "x": round(frame.get("x", 0)),
            "y": round(frame.get("y", 0)),
            "width": round(frame.get("width", 0)),
            "height": round(frame.get("height", 0)),
        }
        result.append({
            "type": normalize_type(el.get("type", "Other"), IOS_TYPE_MAP),
            "label": el.get("AXLabel", "") or "",
            "accessibility_id": el.get("AXUniqueId", "") or "",
            "bounds": bounds,
            "center": compute_center(bounds),
            "enabled": el.get("enabled", False),
            "visible": is_visible(bounds, screen_width, screen_height),
            "children": [],
        })
    return result
