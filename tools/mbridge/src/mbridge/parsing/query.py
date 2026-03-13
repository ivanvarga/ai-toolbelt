import xml.etree.ElementTree as ET


def find_elements(elements, id=None, text=None, exact=False, element_type=None, xpath=None):
    if xpath is not None:
        root = _to_xml(elements)
        normalized_xpath = xpath
        if normalized_xpath.startswith("//"):
            normalized_xpath = "." + normalized_xpath
        matches = root.findall(normalized_xpath)
        return [_from_xml_node(node) for node in matches]

    flat = list(_flatten(elements))

    if id is None and text is None and element_type is None:
        return flat

    results = []
    for el in flat:
        if id is not None and el.get("accessibility_id") != id:
            continue
        if text is not None:
            label = el.get("label", "")
            if exact:
                if label != text:
                    continue
            else:
                if text not in label:
                    continue
        if element_type is not None and el.get("type") != element_type:
            continue
        results.append(el)
    return results


def _flatten(elements):
    for el in elements:
        yield el
        yield from _flatten(el.get("children", []))


def _to_xml(elements):
    root = ET.Element("root")
    for el in elements:
        _build_xml_node(root, el)
    return root


def _build_xml_node(parent, el):
    tag = el.get("type", "Unknown")
    node = ET.SubElement(parent, tag)
    node.set("accessibility_id", el.get("accessibility_id", ""))
    node.set("label", el.get("label", ""))
    node.set("enabled", str(el.get("enabled", False)))
    node.set("visible", str(el.get("visible", False)))
    bounds = el.get("bounds", {})
    node.set("bounds_x", str(bounds.get("x", 0)))
    node.set("bounds_y", str(bounds.get("y", 0)))
    node.set("bounds_width", str(bounds.get("width", 0)))
    node.set("bounds_height", str(bounds.get("height", 0)))
    center = el.get("center", {})
    node.set("center_x", str(center.get("x", 0)))
    node.set("center_y", str(center.get("y", 0)))
    for child in el.get("children", []):
        _build_xml_node(node, child)


def _from_xml_node(xml_node):
    bounds = {
        "x": int(xml_node.get("bounds_x", "0")),
        "y": int(xml_node.get("bounds_y", "0")),
        "width": int(xml_node.get("bounds_width", "0")),
        "height": int(xml_node.get("bounds_height", "0")),
    }
    center = {
        "x": int(xml_node.get("center_x", "0")),
        "y": int(xml_node.get("center_y", "0")),
    }
    children = [_from_xml_node(child) for child in xml_node]
    return {
        "type": xml_node.tag,
        "label": xml_node.get("label", ""),
        "accessibility_id": xml_node.get("accessibility_id", ""),
        "bounds": bounds,
        "center": center,
        "enabled": xml_node.get("enabled", "False") == "True",
        "visible": xml_node.get("visible", "False") == "True",
        "children": children,
    }
