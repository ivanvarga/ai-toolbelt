import io
import os
import tempfile

from mbridge.platforms import android, ios

_reader = None


def _detect_gpu():
    try:
        import torch
        if torch.cuda.is_available() or torch.backends.mps.is_available():
            return True
    except (ImportError, AttributeError):
        pass
    return False


def _get_reader():
    global _reader
    if _reader is None:
        import warnings
        warnings.filterwarnings("ignore", message=".*pin_memory.*")
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=_detect_gpu(), verbose=False)
    return _reader


def ocr_screenshot(device_id, platform):
    from PIL import Image

    reader = _get_reader()

    if platform == "ios":
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp_path = tmp.name
        tmp.close()
        try:
            ios.screenshot(device_id, tmp_path)
            results = reader.readtext(tmp_path)
        finally:
            os.unlink(tmp_path)
    else:
        raw = android.screenshot_bytes(device_id)
        img = Image.open(io.BytesIO(raw))
        results = reader.readtext(img)

    return "\n".join(text for _, text, _ in results)
