from conftest import run_mbridge


def test_action_tap_by_text(device_id):
    dump, err, code = run_mbridge("ui", "dump", device_id)
    assert code == 0
    tappable = None
    for el in dump:
        if el.get("label") and el.get("enabled"):
            tappable = el["label"]
            break
    if tappable:
        data, err, code = run_mbridge("action", "tap", device_id, "--text", tappable)
        assert code == 0
        assert data["status"] == "tapped"


def test_action_tap_by_coords(device_id):
    data, err, code = run_mbridge("action", "tap", device_id, "--x", "100", "--y", "100")
    assert code == 0
    assert data["status"] == "tapped"


def test_action_swipe_up(device_id):
    data, err, code = run_mbridge("action", "swipe", device_id, "up")
    assert code == 0
    assert data["status"] == "swiped"
    assert data["direction"] == "up"


def test_action_swipe_down(device_id):
    data, err, code = run_mbridge("action", "swipe", device_id, "down", "--distance", "0.3")
    assert code == 0
    assert data["status"] == "swiped"


def test_action_type_text(device_id):
    data, err, code = run_mbridge("action", "type", device_id, "hello")
    assert code == 0
    assert data["status"] == "typed"


def test_action_tap_no_args(device_id):
    data, err, code = run_mbridge("action", "tap", device_id)
    assert code != 0
