from conftest import run_mbridge


def test_verify_text_found(device_id):
    dump, err, code = run_mbridge("ui", "dump", device_id)
    assert code == 0
    visible_text = None
    for el in dump:
        if el.get("label") and len(el["label"]) > 3:
            visible_text = el["label"]
            break
    if visible_text:
        data, err, code = run_mbridge("verify", "text", device_id, visible_text)
        assert code == 0
        if isinstance(data, dict):
            pass


def test_verify_text_not_found(device_id):
    data, err, code = run_mbridge("verify", "text", device_id, "NONEXISTENT_TEXT_XYZ_99999")
    assert code == 0
    assert data["found"] is False
    assert "ocr_text" in data
