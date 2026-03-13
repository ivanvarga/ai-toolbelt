import io
from unittest.mock import MagicMock, patch, call

import pytest


class TestRequireTesseract:
    @patch("shutil.which", return_value=None)
    def test_raises_when_not_found(self, mock_which):
        from mbridge.ocr import require_tesseract
        with pytest.raises(RuntimeError, match="tesseract"):
            require_tesseract()

    @patch("shutil.which", return_value="/usr/local/bin/tesseract")
    def test_passes_when_found(self, mock_which):
        from mbridge.ocr import require_tesseract
        require_tesseract()


class TestOcrScreenshotIOS:
    @patch("mbridge.ocr.pytesseract")
    @patch("mbridge.ocr.Image")
    @patch("mbridge.ocr.ios")
    @patch("mbridge.ocr.require_tesseract")
    def test_ios_captures_and_ocrs(self, mock_req, mock_ios, mock_image, mock_tess):
        mock_tess.image_to_string.return_value = "Hello World"
        mock_img = MagicMock()
        mock_image.open.return_value = mock_img

        from mbridge.ocr import ocr_screenshot
        result = ocr_screenshot("device-1", "ios")

        assert result == "Hello World"
        assert mock_ios.screenshot.called
        mock_tess.image_to_string.assert_called_once_with(mock_img)

    @patch("mbridge.ocr.pytesseract")
    @patch("mbridge.ocr.Image")
    @patch("mbridge.ocr.ios")
    @patch("mbridge.ocr.require_tesseract")
    @patch("os.unlink")
    def test_ios_cleans_up_temp_file_on_error(self, mock_unlink, mock_req, mock_ios, mock_image, mock_tess):
        mock_tess.image_to_string.side_effect = RuntimeError("OCR failed")
        mock_img = MagicMock()
        mock_image.open.return_value = mock_img

        from mbridge.ocr import ocr_screenshot
        with pytest.raises(RuntimeError, match="OCR failed"):
            ocr_screenshot("device-1", "ios")

        mock_unlink.assert_called_once()


class TestOcrScreenshotAndroid:
    @patch("mbridge.ocr.pytesseract")
    @patch("mbridge.ocr.Image")
    @patch("mbridge.ocr.android")
    @patch("mbridge.ocr.require_tesseract")
    def test_android_captures_and_ocrs(self, mock_req, mock_android, mock_image, mock_tess):
        mock_android.screenshot_bytes.return_value = b"\x89PNG\r\n"
        mock_tess.image_to_string.return_value = "Android Text"
        mock_img = MagicMock()
        mock_image.open.return_value = mock_img

        from mbridge.ocr import ocr_screenshot
        result = ocr_screenshot("device-1", "android")

        assert result == "Android Text"
        mock_android.screenshot_bytes.assert_called_once_with("device-1")
        mock_tess.image_to_string.assert_called_once_with(mock_img)


class TestVerifyTextSubstring:
    @patch("mbridge.verify.ocr_screenshot", return_value="Welcome to the app")
    @patch("mbridge.verify._detect_platform", return_value="ios")
    def test_found(self, mock_plat, mock_ocr):
        from click.testing import CliRunner
        from mbridge.verify import verify_group
        runner = CliRunner()
        result = runner.invoke(verify_group, ["text", "device-1", "Welcome"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert data["found"] is True
        assert data["text"] == "Welcome"

    @patch("mbridge.verify.ocr_screenshot", return_value="Welcome to the app")
    @patch("mbridge.verify._detect_platform", return_value="ios")
    def test_not_found(self, mock_plat, mock_ocr):
        from click.testing import CliRunner
        from mbridge.verify import verify_group
        runner = CliRunner()
        result = runner.invoke(verify_group, ["text", "device-1", "Goodbye"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert data["found"] is False
        assert data["expected"] == "Goodbye"
        assert data["ocr_text"] == "Welcome to the app"


class TestVerifyTextExact:
    @patch("mbridge.verify.ocr_screenshot", return_value="  Hello World  \n")
    @patch("mbridge.verify._detect_platform", return_value="android")
    def test_exact_found_with_whitespace_strip(self, mock_plat, mock_ocr):
        from click.testing import CliRunner
        from mbridge.verify import verify_group
        runner = CliRunner()
        result = runner.invoke(verify_group, ["text", "--exact", "device-1", "Hello World"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert data["found"] is True
        assert data["text"] == "Hello World"

    @patch("mbridge.verify.ocr_screenshot", return_value="Hello World and more text")
    @patch("mbridge.verify._detect_platform", return_value="android")
    def test_exact_not_found_substring_present(self, mock_plat, mock_ocr):
        from click.testing import CliRunner
        from mbridge.verify import verify_group
        runner = CliRunner()
        result = runner.invoke(verify_group, ["text", "--exact", "device-1", "Hello World"])
        assert result.exit_code == 0
        import json
        data = json.loads(result.output)
        assert data["found"] is False
        assert data["expected"] == "Hello World"
        assert data["ocr_text"] == "Hello World and more text"


class TestVerifyTextPlatformError:
    @patch("mbridge.verify._detect_platform", return_value=None)
    def test_unknown_platform_errors(self, mock_plat):
        from click.testing import CliRunner
        from mbridge.verify import verify_group
        runner = CliRunner()
        result = runner.invoke(verify_group, ["text", "device-1", "Hello"])
        assert result.exit_code != 0


class TestIosScreenshot:
    @patch("mbridge.platforms.ios.run_cmd")
    @patch("mbridge.platforms.ios.require_xcrun")
    def test_calls_xcrun_simctl_io(self, mock_req, mock_run):
        from mbridge.platforms.ios import screenshot
        screenshot("device-1", "/tmp/shot.png")
        mock_run.assert_called_once_with(
            ["xcrun", "simctl", "io", "device-1", "screenshot", "/tmp/shot.png"]
        )


class TestAndroidScreenshotBytes:
    @patch("subprocess.run")
    @patch("mbridge.platforms.android.require_adb")
    def test_returns_stdout_bytes(self, mock_req, mock_run):
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = b"\x89PNG\r\nfakedata"
        mock_run.return_value = mock_result

        from mbridge.platforms.android import screenshot_bytes
        raw = screenshot_bytes("device-1")

        assert raw == b"\x89PNG\r\nfakedata"
        mock_run.assert_called_once_with(
            ["adb", "-s", "device-1", "exec-out", "screencap", "-p"],
            capture_output=True,
        )

    @patch("subprocess.run")
    @patch("mbridge.platforms.android.require_adb")
    def test_raises_on_failure(self, mock_req, mock_run):
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stderr = b"error"
        mock_run.return_value = mock_result

        from mbridge.platforms.android import screenshot_bytes
        with pytest.raises(RuntimeError):
            screenshot_bytes("device-1")
