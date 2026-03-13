from unittest.mock import MagicMock, call, patch

import pytest

from mbridge.action import _parse_text_segments, _resolve_element, compute_swipe_coords


SAMPLE_ELEMENTS = [
    {
        "type": "Button",
        "label": "Submit",
        "accessibility_id": "submit_btn",
        "bounds": {"x": 100, "y": 200, "width": 150, "height": 50},
        "center": {"x": 175, "y": 225},
        "enabled": True,
        "visible": True,
        "children": [],
    },
    {
        "type": "Button",
        "label": "Cancel",
        "accessibility_id": "cancel_btn",
        "bounds": {"x": 100, "y": 300, "width": 150, "height": 50},
        "center": {"x": 175, "y": 325},
        "enabled": True,
        "visible": True,
        "children": [],
    },
    {
        "type": "TextField",
        "label": "Email",
        "accessibility_id": "email_field",
        "bounds": {"x": 50, "y": 400, "width": 300, "height": 44},
        "center": {"x": 200, "y": 422},
        "enabled": True,
        "visible": True,
        "children": [],
    },
]


class TestResolveElement:
    @patch("mbridge.action.find_elements")
    @patch("mbridge.action._capture_dump")
    def test_single_match_returns_element(self, mock_dump, mock_find):
        mock_dump.return_value = SAMPLE_ELEMENTS
        mock_find.return_value = [SAMPLE_ELEMENTS[0]]
        result = _resolve_element("device-1", text="Submit")
        assert result["center"]["x"] == 175
        assert result["center"]["y"] == 225

    @patch("mbridge.action.find_elements")
    @patch("mbridge.action._capture_dump")
    def test_no_match_exits(self, mock_dump, mock_find):
        mock_dump.return_value = SAMPLE_ELEMENTS
        mock_find.return_value = []
        with pytest.raises(SystemExit):
            _resolve_element("device-1", text="Nonexistent")

    @patch("mbridge.action.find_elements")
    @patch("mbridge.action._capture_dump")
    def test_unique_multi_match_exits(self, mock_dump, mock_find):
        mock_dump.return_value = SAMPLE_ELEMENTS
        mock_find.return_value = [SAMPLE_ELEMENTS[0], SAMPLE_ELEMENTS[1]]
        with pytest.raises(SystemExit):
            _resolve_element("device-1", text="Button", unique=True)

    @patch("mbridge.action.find_elements")
    @patch("mbridge.action._capture_dump")
    def test_unique_single_match_returns(self, mock_dump, mock_find):
        mock_dump.return_value = SAMPLE_ELEMENTS
        mock_find.return_value = [SAMPLE_ELEMENTS[2]]
        result = _resolve_element("device-1", element_id="email_field", unique=True)
        assert result["accessibility_id"] == "email_field"

    @patch("mbridge.action.find_elements")
    @patch("mbridge.action._capture_dump")
    def test_passes_query_params(self, mock_dump, mock_find):
        mock_dump.return_value = SAMPLE_ELEMENTS
        mock_find.return_value = [SAMPLE_ELEMENTS[0]]
        _resolve_element(
            "device-1",
            text="Submit",
            element_id="submit_btn",
            element_type="Button",
            exact=True,
        )
        mock_find.assert_called_once_with(
            SAMPLE_ELEMENTS,
            id="submit_btn",
            text="Submit",
            exact=True,
            element_type="Button",
        )


class TestParseTextSegments:
    def test_plain_text(self):
        assert _parse_text_segments("hello") == [("text", "hello")]

    def test_text_with_newline(self):
        result = _parse_text_segments("hello\\nworld")
        assert result == [("text", "hello"), ("key", "\n"), ("text", "world")]

    def test_consecutive_escapes(self):
        result = _parse_text_segments("\\n\\t")
        assert result == [("key", "\n"), ("key", "\t")]

    def test_escape_at_start(self):
        result = _parse_text_segments("\\bhello")
        assert result == [("key", "\b"), ("text", "hello")]

    def test_escape_at_end(self):
        result = _parse_text_segments("hello\\n")
        assert result == [("text", "hello"), ("key", "\n")]

    def test_all_escape_types(self):
        result = _parse_text_segments("\\n\\b\\t\\e")
        assert result == [("key", "\n"), ("key", "\b"), ("key", "\t"), ("key", "\x1b")]

    def test_empty_string(self):
        assert _parse_text_segments("") == []


class TestComputeSwipeCoords:
    def test_swipe_up(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "up")
        assert x1 == 200
        assert y1 == 400
        assert x2 == 200
        assert y2 == 400 - int(800 * 0.5)

    def test_swipe_down(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "down")
        assert x1 == 200
        assert y1 == 400
        assert x2 == 200
        assert y2 == 400 + int(800 * 0.5)

    def test_swipe_left(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "left")
        assert x1 == 200
        assert y1 == 400
        assert x2 == 200 - int(400 * 0.5)
        assert y2 == 400

    def test_swipe_right(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "right")
        assert x1 == 200
        assert y1 == 400
        assert x2 == 200 + int(400 * 0.5)
        assert y2 == 400

    def test_custom_start(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "up", start_x=100, start_y=600)
        assert x1 == 100
        assert y1 == 600
        assert x2 == 100
        assert y2 == 600 - int(800 * 0.5)

    def test_custom_distance(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "up", distance_pct=0.3)
        assert x1 == 200
        assert y1 == 400
        assert x2 == 200
        assert y2 == 400 - int(800 * 0.3)

    def test_clamp_to_bounds(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "up", distance_pct=1.0, start_x=200, start_y=100)
        assert y2 == 0

    def test_clamp_right_edge(self):
        x1, y1, x2, y2 = compute_swipe_coords(400, 800, "right", distance_pct=1.0, start_x=300, start_y=400)
        assert x2 == 400


class TestAndroidTextEncoding:
    @patch("mbridge.platforms.android.run_cmd")
    @patch("mbridge.platforms.android.require_adb")
    def test_plain_text(self, mock_req, mock_run):
        from mbridge.platforms.android import type_text
        type_text("device-1", "hello")
        mock_run.assert_called_once_with(
            ["adb", "-s", "device-1", "shell", "input", "text", "hello"]
        )

    @patch("mbridge.platforms.android.run_cmd")
    @patch("mbridge.platforms.android.require_adb")
    def test_spaces_encoded(self, mock_req, mock_run):
        from mbridge.platforms.android import type_text
        type_text("device-1", "hello world")
        args = mock_run.call_args[0][0]
        assert "%s" in args[-1]

    @patch("mbridge.platforms.android.run_cmd")
    @patch("mbridge.platforms.android.require_adb")
    def test_special_chars_escaped(self, mock_req, mock_run):
        from mbridge.platforms.android import type_text
        type_text("device-1", "a&b")
        args = mock_run.call_args[0][0]
        assert "\\&" in args[-1]


class TestPlatformFunctionSignatures:
    @patch("mbridge.platforms.ios.run_cmd")
    @patch("mbridge.platforms.ios.require_idb")
    def test_ios_tap(self, mock_req, mock_run):
        from mbridge.platforms.ios import tap
        tap("device-1", 100, 200)
        mock_run.assert_called_once_with(
            ["idb", "ui", "tap", "100", "200", "--udid", "device-1"]
        )

    @patch("mbridge.platforms.ios.run_cmd")
    @patch("mbridge.platforms.ios.require_idb")
    def test_ios_swipe(self, mock_req, mock_run):
        from mbridge.platforms.ios import swipe
        swipe("device-1", 100, 200, 300, 400)
        mock_run.assert_called_once_with(
            ["idb", "ui", "swipe", "100", "200", "300", "400", "--udid", "device-1"]
        )

    @patch("mbridge.platforms.ios.run_cmd")
    @patch("mbridge.platforms.ios.require_idb")
    def test_ios_type_text(self, mock_req, mock_run):
        from mbridge.platforms.ios import type_text
        type_text("device-1", "hello")
        mock_run.assert_called_once_with(
            ["idb", "ui", "text", "hello", "--udid", "device-1"]
        )

    @patch("mbridge.platforms.ios.run_cmd")
    @patch("mbridge.platforms.ios.require_idb")
    def test_ios_key_press(self, mock_req, mock_run):
        from mbridge.platforms.ios import key_press
        key_press("device-1", 40)
        mock_run.assert_called_once_with(
            ["idb", "ui", "key", "40", "--udid", "device-1"]
        )

    @patch("mbridge.platforms.android.run_cmd")
    @patch("mbridge.platforms.android.require_adb")
    def test_android_tap(self, mock_req, mock_run):
        from mbridge.platforms.android import tap
        tap("device-1", 100, 200)
        mock_run.assert_called_once_with(
            ["adb", "-s", "device-1", "shell", "input", "tap", "100", "200"]
        )

    @patch("mbridge.platforms.android.run_cmd")
    @patch("mbridge.platforms.android.require_adb")
    def test_android_swipe(self, mock_req, mock_run):
        from mbridge.platforms.android import swipe
        swipe("device-1", 100, 200, 300, 400)
        mock_run.assert_called_once_with(
            ["adb", "-s", "device-1", "shell", "input", "swipe", "100", "200", "300", "400", "300"]
        )

    @patch("mbridge.platforms.android.run_cmd")
    @patch("mbridge.platforms.android.require_adb")
    def test_android_keyevent(self, mock_req, mock_run):
        from mbridge.platforms.android import keyevent
        keyevent("device-1", 67)
        mock_run.assert_called_once_with(
            ["adb", "-s", "device-1", "shell", "input", "keyevent", "67"]
        )
