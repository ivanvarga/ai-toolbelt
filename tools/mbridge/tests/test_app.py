from conftest import run_mbridge


def test_app_list(device_id):
    data, err, code = run_mbridge("app", "list", device_id)
    assert code == 0
    assert isinstance(data, list)


def test_app_foreground(device_id):
    data, err, code = run_mbridge("app", "foreground", device_id)
    assert code == 0
    assert isinstance(data, dict)


def test_app_launch(device_id, bundle_id):
    data, err, code = run_mbridge("app", "launch", device_id, bundle_id)
    assert code == 0


def test_app_foreground_after_launch(device_id, bundle_id):
    run_mbridge("app", "launch", device_id, bundle_id)
    data, err, code = run_mbridge("app", "foreground", device_id)
    assert code == 0
    assert isinstance(data, dict)


def test_app_open_url(device_id):
    data, err, code = run_mbridge("app", "open-url", device_id, "https://example.com")
    assert code == 0
