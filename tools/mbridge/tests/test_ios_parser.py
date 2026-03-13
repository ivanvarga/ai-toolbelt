import json
from pathlib import Path

from mbridge.parsing.ios_parser import parse_ios_dump

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture():
    with open(FIXTURES / "idb_describe_all.json") as f:
        return json.load(f)


class TestParseIosDump:
    def test_returns_correct_count(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert len(elements) == 7

    def test_element_has_all_required_fields(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        required_fields = {"type", "label", "accessibility_id", "bounds", "center", "enabled", "visible", "children"}
        for el in elements:
            assert set(el.keys()) == required_fields

    def test_button_type_stays_button(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["type"] == "Button"

    def test_static_text_becomes_label(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[1]["type"] == "Label"

    def test_label_from_ax_label(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["label"] == "Sign In"

    def test_accessibility_id_from_ax_unique_id(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["accessibility_id"] == "login_btn"

    def test_bounds_are_integers(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        bounds = elements[0]["bounds"]
        assert all(isinstance(v, int) for v in bounds.values())

    def test_bounds_values(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["bounds"] == {"x": 50, "y": 100, "width": 300, "height": 44}

    def test_center_computed(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["center"] == {"x": 200, "y": 122}

    def test_children_always_empty(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        for el in elements:
            assert el["children"] == []

    def test_visible_onscreen_element(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["visible"] is True

    def test_offscreen_element_not_visible(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        offscreen = [e for e in elements if e["accessibility_id"] == "offscreen_btn"][0]
        assert offscreen["visible"] is False

    def test_enabled_field(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        assert elements[0]["enabled"] is True
        offscreen = [e for e in elements if e["accessibility_id"] == "offscreen_btn"][0]
        assert offscreen["enabled"] is False

    def test_group_becomes_view(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        group = [e for e in elements if e["accessibility_id"] == "main_group"][0]
        assert group["type"] == "View"

    def test_empty_label_for_missing_ax_label(self):
        elements = parse_ios_dump(_load_fixture(), 390, 844)
        group = [e for e in elements if e["accessibility_id"] == "main_group"][0]
        assert group["label"] == ""
