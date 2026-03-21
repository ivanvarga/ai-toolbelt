import time

from conftest import run_mbridge


def test_ui_dump(device_id):
    data, err, code = run_mbridge("ui", "dump", device_id)
    assert code == 0
    assert isinstance(data, list)
    assert len(data) > 0


def test_ui_dump_element_schema(device_id):
    data, err, code = run_mbridge("ui", "dump", device_id)
    assert code == 0
    el = data[0]
    assert "type" in el
    assert "bounds" in el
    assert "center" in el
    assert "x" in el["center"]
    assert "y" in el["center"]


def test_ui_find_by_type(device_id):
    data, err, code = run_mbridge("ui", "find", device_id, "--type", "Button")
    assert code == 0
    assert isinstance(data, list)


def test_ui_find_by_text(device_id):
    data, err, code = run_mbridge("ui", "dump", device_id)
    assert code == 0 and len(data) > 0
    first_label = None
    for el in data:
        if el.get("label"):
            first_label = el["label"]
            break
    if first_label:
        found, err, code = run_mbridge("ui", "find", device_id, "--text", first_label)
        assert code == 0
        assert len(found) > 0


def test_ui_wait_for_existing_element(device_id):
    data, err, code = run_mbridge("ui", "dump", device_id)
    assert code == 0 and len(data) > 0
    first_label = None
    for el in data:
        if el.get("label"):
            first_label = el["label"]
            break
    if first_label:
        found, err, code = run_mbridge(
            "ui", "wait-for", device_id, "--text", first_label, "--timeout", "5"
        )
        assert code == 0
        assert found["label"] == first_label or first_label in found.get("label", "")


def test_ui_wait_for_timeout(device_id):
    start = time.monotonic()
    data, err, code = run_mbridge(
        "ui", "wait-for", device_id, "--text", "NONEXISTENT_ELEMENT_XYZ_12345",
        "--timeout", "2", "--interval", "0.5"
    )
    elapsed = time.monotonic() - start
    assert code != 0
    assert err is not None
    assert "Timeout" in str(err)
    assert elapsed >= 1.5


def test_ui_wait_for_no_query_flags(device_id):
    data, err, code = run_mbridge("ui", "wait-for", device_id)
    assert code != 0
    assert "query flag" in str(err).lower() or "provide" in str(err).lower()
