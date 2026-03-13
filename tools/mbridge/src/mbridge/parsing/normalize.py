import re

IOS_TYPE_MAP = {
    "Button": "Button",
    "StaticText": "Label",
    "TextField": "TextField",
    "SecureTextField": "SecureTextField",
    "TextArea": "TextArea",
    "Image": "Image",
    "Switch": "Switch",
    "Slider": "Slider",
    "Cell": "Cell",
    "Table": "ScrollView",
    "ScrollView": "ScrollView",
    "NavigationBar": "NavigationBar",
    "TabBar": "TabBar",
    "Alert": "Alert",
    "Sheet": "Sheet",
    "Group": "View",
    "Other": "View",
    "Application": "Application",
    "Window": "Window",
}

ANDROID_TYPE_MAP = {
    "android.widget.Button": "Button",
    "android.widget.TextView": "Label",
    "android.widget.EditText": "TextField",
    "android.widget.ImageView": "Image",
    "android.widget.ImageButton": "Button",
    "android.widget.Switch": "Switch",
    "android.widget.CheckBox": "CheckBox",
    "android.widget.RadioButton": "RadioButton",
    "android.widget.Spinner": "Picker",
    "android.widget.SeekBar": "Slider",
    "android.widget.ProgressBar": "ProgressBar",
    "android.widget.ScrollView": "ScrollView",
    "android.widget.HorizontalScrollView": "ScrollView",
    "android.widget.ListView": "ScrollView",
    "android.widget.RecyclerView": "ScrollView",
    "android.widget.FrameLayout": "View",
    "android.widget.LinearLayout": "View",
    "android.widget.RelativeLayout": "View",
    "android.view.View": "View",
    "android.view.ViewGroup": "View",
    "android.webkit.WebView": "WebView",
}

_BOUNDS_RE = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")


def normalize_type(raw_type, type_map):
    if raw_type in type_map:
        return type_map[raw_type]
    if "." in raw_type:
        return raw_type.rsplit(".", 1)[-1]
    return raw_type


def compute_center(bounds):
    return {
        "x": bounds["x"] + bounds["width"] // 2,
        "y": bounds["y"] + bounds["height"] // 2,
    }


def is_visible(bounds, screen_width, screen_height):
    w, h = bounds["width"], bounds["height"]
    if w <= 0 or h <= 0:
        return False
    x, y = bounds["x"], bounds["y"]
    return x + w > 0 and y + h > 0 and x < screen_width and y < screen_height


def parse_android_bounds(bounds_str):
    m = _BOUNDS_RE.match(bounds_str)
    if not m:
        return None
    x1, y1, x2, y2 = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
    return {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1}
