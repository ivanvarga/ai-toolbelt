import io
import os
import shutil
import tempfile

import pytesseract
from PIL import Image

from mbridge.platforms import android, ios


def require_tesseract():
    if not shutil.which("tesseract"):
        raise RuntimeError(
            "tesseract not found. Install: brew install tesseract"
        )


def ocr_screenshot(device_id, platform):
    require_tesseract()

    if platform == "ios":
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp_path = tmp.name
        tmp.close()
        try:
            ios.screenshot(device_id, tmp_path)
            img = Image.open(tmp_path)
            return pytesseract.image_to_string(img)
        finally:
            os.unlink(tmp_path)

    raw = android.screenshot_bytes(device_id)
    img = Image.open(io.BytesIO(raw))
    return pytesseract.image_to_string(img)
