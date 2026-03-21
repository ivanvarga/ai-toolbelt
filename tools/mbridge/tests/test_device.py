from conftest import run_mbridge


def test_device_list():
    data, err, code = run_mbridge("device", "list")
    assert code == 0
    assert isinstance(data, list)


def test_device_list_ios():
    data, err, code = run_mbridge("device", "list", "--platform", "ios")
    assert code == 0
    assert isinstance(data, list)
    for d in data:
        assert d["platform"] == "ios"


def test_device_list_android():
    data, err, code = run_mbridge("device", "list", "--platform", "android")
    assert code == 0
    assert isinstance(data, list)
    for d in data:
        assert d["platform"] == "android"


def test_device_info(device_id):
    data, err, code = run_mbridge("device", "info", device_id)
    assert code == 0
    assert "id" in data
    assert "name" in data
    assert "screen" in data or "state" in data
