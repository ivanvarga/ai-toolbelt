from mbridge.parsing.query import find_elements

ELEMENTS = [
    {
        "type": "Button",
        "label": "Sign In",
        "accessibility_id": "login_btn",
        "bounds": {"x": 30, "y": 700, "width": 360, "height": 50},
        "center": {"x": 210, "y": 725},
        "enabled": True,
        "visible": True,
        "children": [],
    },
    {
        "type": "Label",
        "label": "Welcome",
        "accessibility_id": "",
        "bounds": {"x": 50, "y": 100, "width": 300, "height": 40},
        "center": {"x": 200, "y": 120},
        "enabled": True,
        "visible": True,
        "children": [],
    },
    {
        "type": "TextField",
        "label": "",
        "accessibility_id": "email_field",
        "bounds": {"x": 30, "y": 200, "width": 360, "height": 44},
        "center": {"x": 210, "y": 222},
        "enabled": True,
        "visible": True,
        "children": [],
    },
    {
        "type": "Button",
        "label": "Cancel",
        "accessibility_id": "cancel_btn",
        "bounds": {"x": 30, "y": 760, "width": 360, "height": 50},
        "center": {"x": 210, "y": 785},
        "enabled": True,
        "visible": True,
        "children": [],
    },
    {
        "type": "View",
        "label": "",
        "accessibility_id": "container_view",
        "bounds": {"x": 0, "y": 400, "width": 390, "height": 200},
        "center": {"x": 195, "y": 500},
        "enabled": True,
        "visible": True,
        "children": [
            {
                "type": "Button",
                "label": "Nested Action",
                "accessibility_id": "nested_btn",
                "bounds": {"x": 50, "y": 420, "width": 200, "height": 44},
                "center": {"x": 150, "y": 442},
                "enabled": True,
                "visible": True,
                "children": [],
            },
            {
                "type": "Label",
                "label": "Inner Label",
                "accessibility_id": "",
                "bounds": {"x": 50, "y": 470, "width": 200, "height": 30},
                "center": {"x": 150, "y": 485},
                "enabled": True,
                "visible": True,
                "children": [],
            },
        ],
    },
]


def test_find_by_id():
    result = find_elements(ELEMENTS, id="login_btn")
    assert len(result) == 1
    assert result[0]["accessibility_id"] == "login_btn"


def test_find_by_id_no_match():
    result = find_elements(ELEMENTS, id="nonexistent")
    assert result == []


def test_find_by_text_substring():
    result = find_elements(ELEMENTS, text="Sign")
    assert len(result) == 1
    assert result[0]["label"] == "Sign In"


def test_find_by_text_exact_no_match():
    result = find_elements(ELEMENTS, text="Sign", exact=True)
    assert result == []


def test_find_by_text_exact_match():
    result = find_elements(ELEMENTS, text="Sign In", exact=True)
    assert len(result) == 1
    assert result[0]["label"] == "Sign In"


def test_find_by_text_case_sensitive():
    result = find_elements(ELEMENTS, text="sign")
    assert result == []


def test_find_by_type():
    result = find_elements(ELEMENTS, element_type="Button")
    assert len(result) == 3
    assert all(e["type"] == "Button" for e in result)


def test_find_combined_text_and_type():
    result = find_elements(ELEMENTS, text="Sign", element_type="Button")
    assert len(result) == 1
    assert result[0]["label"] == "Sign In"
    assert result[0]["type"] == "Button"


def test_find_xpath_by_type():
    result = find_elements(ELEMENTS, xpath="//Button")
    assert len(result) == 3


def test_find_xpath_with_attribute():
    result = find_elements(ELEMENTS, xpath="//Button[@accessibility_id='login_btn']")
    assert len(result) == 1
    assert result[0]["accessibility_id"] == "login_btn"


def test_find_nested_children_by_type():
    result = find_elements(ELEMENTS, element_type="Button")
    ids = [e["accessibility_id"] for e in result]
    assert "nested_btn" in ids


def test_find_no_filters_returns_all():
    result = find_elements(ELEMENTS)
    assert len(result) == 7
