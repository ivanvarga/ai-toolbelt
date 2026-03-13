from pathlib import Path

from mbridge.parsing.android_parser import _strip_resource_id, parse_android_dump

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture():
    return (FIXTURES / "uiautomator_dump.xml").read_text()


class TestParseAndroidDump:
    def test_returns_nested_structure(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        assert len(elements) >= 1
        assert any(len(e["children"]) > 0 for e in elements)

    def test_element_has_all_required_fields(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        required_fields = {"type", "label", "accessibility_id", "bounds", "center", "enabled", "visible", "children"}

        def check_element(el):
            assert set(el.keys()) == required_fields
            for child in el["children"]:
                check_element(child)

        for el in elements:
            check_element(el)

    def test_button_type_normalized(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        button = [e for e in all_elements if e["label"] == "Sign In"][0]
        assert button["type"] == "Button"

    def test_text_view_becomes_label(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        text = [e for e in all_elements if e["label"] == "Welcome to the App"][0]
        assert text["type"] == "Label"

    def test_bounds_parsed_from_bracket_format(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        button = [e for e in all_elements if e["label"] == "Sign In"][0]
        assert button["bounds"] == {"x": 30, "y": 700, "width": 360, "height": 50}

    def test_center_computed(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        button = [e for e in all_elements if e["label"] == "Sign In"][0]
        assert button["center"] == {"x": 210, "y": 725}

    def test_children_hierarchy_preserved(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        root = elements[0]
        assert root["type"] == "View"
        assert len(root["children"]) > 0
        inner = root["children"][0]
        assert len(inner["children"]) > 0

    def test_enabled_from_attribute(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        button = [e for e in all_elements if e["label"] == "Sign In"][0]
        assert button["enabled"] is True

    def test_visibility_against_screen(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        for el in all_elements:
            if el["bounds"] and el["bounds"]["width"] > 0:
                assert isinstance(el["visible"], bool)

    def test_content_desc_preferred_for_accessibility_id(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        button = [e for e in all_elements if e["label"] == "Sign In"][0]
        assert button["accessibility_id"] == "Login button"

    def test_resource_id_fallback_strips_package(self):
        elements = parse_android_dump(_load_fixture(), 1080, 2340)
        all_elements = _flatten(elements)
        text = [e for e in all_elements if e["label"] == "Welcome to the App"][0]
        assert text["accessibility_id"] == "welcome_text"

    def test_trailing_dump_message_stripped(self):
        xml_with_trailing = _load_fixture() + "UI hierchary dumped to: /dev/tty"
        elements = parse_android_dump(xml_with_trailing, 1080, 2340)
        assert len(elements) >= 1


class TestStripResourceId:
    def test_with_package_prefix(self):
        assert _strip_resource_id("com.example:id/btn_login") == "btn_login"

    def test_without_prefix(self):
        assert _strip_resource_id("simple_id") == "simple_id"

    def test_empty_string(self):
        assert _strip_resource_id("") == ""

    def test_colon_in_middle(self):
        assert _strip_resource_id("com.app:id/some_thing") == "some_thing"


def _flatten(elements):
    result = []
    for el in elements:
        result.append(el)
        result.extend(_flatten(el["children"]))
    return result
