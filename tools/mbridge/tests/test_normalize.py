from mbridge.parsing.normalize import (
    ANDROID_TYPE_MAP,
    IOS_TYPE_MAP,
    compute_center,
    is_visible,
    normalize_type,
    parse_android_bounds,
)


class TestNormalizeType:
    def test_ios_button_stays_button(self):
        assert normalize_type("Button", IOS_TYPE_MAP) == "Button"

    def test_ios_static_text_becomes_label(self):
        assert normalize_type("StaticText", IOS_TYPE_MAP) == "Label"

    def test_ios_unknown_passthrough(self):
        assert normalize_type("UnknownType", IOS_TYPE_MAP) == "UnknownType"

    def test_android_button(self):
        assert normalize_type("android.widget.Button", ANDROID_TYPE_MAP) == "Button"

    def test_android_text_view_becomes_label(self):
        assert normalize_type("android.widget.TextView", ANDROID_TYPE_MAP) == "Label"

    def test_android_unknown_strips_package(self):
        assert normalize_type("com.custom.Widget", ANDROID_TYPE_MAP) == "Widget"

    def test_android_edit_text_becomes_textfield(self):
        assert normalize_type("android.widget.EditText", ANDROID_TYPE_MAP) == "TextField"

    def test_ios_group_becomes_view(self):
        assert normalize_type("Group", IOS_TYPE_MAP) == "View"

    def test_ios_table_becomes_scrollview(self):
        assert normalize_type("Table", IOS_TYPE_MAP) == "ScrollView"

    def test_android_recycler_view_becomes_scrollview(self):
        assert normalize_type("android.widget.RecyclerView", ANDROID_TYPE_MAP) == "ScrollView"


class TestComputeCenter:
    def test_standard_bounds(self):
        assert compute_center({"x": 30, "y": 700, "width": 360, "height": 50}) == {"x": 210, "y": 725}

    def test_origin_bounds(self):
        assert compute_center({"x": 0, "y": 0, "width": 100, "height": 100}) == {"x": 50, "y": 50}

    def test_single_pixel(self):
        assert compute_center({"x": 10, "y": 20, "width": 1, "height": 1}) == {"x": 10, "y": 20}

    def test_odd_dimensions(self):
        result = compute_center({"x": 0, "y": 0, "width": 101, "height": 101})
        assert result == {"x": 50, "y": 50}


class TestIsVisible:
    def test_fully_visible(self):
        assert is_visible({"x": 50, "y": 50, "width": 100, "height": 100}, 390, 844) is True

    def test_fully_off_right(self):
        assert is_visible({"x": 500, "y": 0, "width": 100, "height": 100}, 390, 844) is False

    def test_zero_size(self):
        assert is_visible({"x": 0, "y": 0, "width": 0, "height": 0}, 390, 844) is False

    def test_partially_visible_left(self):
        assert is_visible({"x": -50, "y": 0, "width": 100, "height": 100}, 390, 844) is True

    def test_fully_off_bottom(self):
        assert is_visible({"x": 0, "y": 900, "width": 100, "height": 100}, 390, 844) is False

    def test_fully_off_top(self):
        assert is_visible({"x": 0, "y": -200, "width": 100, "height": 100}, 390, 844) is False

    def test_zero_width(self):
        assert is_visible({"x": 50, "y": 50, "width": 0, "height": 100}, 390, 844) is False

    def test_zero_height(self):
        assert is_visible({"x": 50, "y": 50, "width": 100, "height": 0}, 390, 844) is False


class TestParseAndroidBounds:
    def test_standard_bounds(self):
        result = parse_android_bounds("[30,700][390,750]")
        assert result == {"x": 30, "y": 700, "width": 360, "height": 50}

    def test_full_screen(self):
        result = parse_android_bounds("[0,0][1080,2340]")
        assert result == {"x": 0, "y": 0, "width": 1080, "height": 2340}

    def test_invalid_format(self):
        assert parse_android_bounds("invalid") is None

    def test_empty_string(self):
        assert parse_android_bounds("") is None
