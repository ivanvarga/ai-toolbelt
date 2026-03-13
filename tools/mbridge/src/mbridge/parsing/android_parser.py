import xml.etree.ElementTree as ET

from mbridge.parsing.normalize import (
    ANDROID_TYPE_MAP,
    compute_center,
    is_visible,
    normalize_type,
    parse_android_bounds,
)


def parse_android_dump(xml_string, screen_width=1080, screen_height=2340):
    end_tag = "</hierarchy>"
    idx = xml_string.find(end_tag)
    if idx >= 0:
        xml_string = xml_string[: idx + len(end_tag)]
    root = ET.fromstring(xml_string)
    return [_parse_node(child, screen_width, screen_height) for child in root]


def _parse_node(node, screen_width, screen_height):
    bounds = parse_android_bounds(node.get("bounds", ""))
    content_desc = node.get("content-desc", "")
    resource_id = node.get("resource-id", "")
    accessibility_id = content_desc if content_desc else _strip_resource_id(resource_id)
    return {
        "type": normalize_type(node.get("class", ""), ANDROID_TYPE_MAP),
        "label": node.get("text", "") or "",
        "accessibility_id": accessibility_id,
        "bounds": bounds,
        "center": compute_center(bounds) if bounds else {"x": 0, "y": 0},
        "enabled": node.get("enabled", "false") == "true",
        "visible": is_visible(bounds, screen_width, screen_height) if bounds else False,
        "children": [_parse_node(child, screen_width, screen_height) for child in node],
    }


def _strip_resource_id(rid):
    if ":" in rid:
        return rid.rsplit("/", 1)[-1] if "/" in rid else rid.rsplit(":", 1)[-1]
    return rid
