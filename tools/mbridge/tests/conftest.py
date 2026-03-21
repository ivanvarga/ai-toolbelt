import json
import os
import subprocess

import pytest

DEVICE_ID = os.environ.get("MBRIDGE_TEST_DEVICE", "")
BUNDLE_ID = os.environ.get("MBRIDGE_TEST_BUNDLE", "")


@pytest.fixture
def device_id():
    if not DEVICE_ID:
        pytest.skip("MBRIDGE_TEST_DEVICE not set")
    return DEVICE_ID


@pytest.fixture
def bundle_id():
    if not BUNDLE_ID:
        pytest.skip("MBRIDGE_TEST_BUNDLE not set")
    return BUNDLE_ID


def run_mbridge(*args, timeout=30):
    result = subprocess.run(
        ["mbridge", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    stdout_data = None
    stderr_data = None
    if result.stdout.strip():
        try:
            stdout_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            stdout_data = result.stdout
    if result.stderr.strip():
        try:
            stderr_data = json.loads(result.stderr)
        except json.JSONDecodeError:
            stderr_data = result.stderr
    return stdout_data, stderr_data, result.returncode
