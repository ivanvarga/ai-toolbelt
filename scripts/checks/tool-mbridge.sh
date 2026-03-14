#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if mbridge --help >/dev/null 2>&1; then
    echo "PASS tool-mbridge mbridge CLI installed"
else
    echo "FAIL tool-mbridge mbridge not installed. Run: node ${PLUGIN_ROOT}/tools/mbridge/setup.js"
fi

PYTHON_VERSION=$(python3 --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
if [ -n "$PYTHON_VERSION" ]; then
    MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
    MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 12 ]; then
        echo "PASS tool-mbridge-python Python ${PYTHON_VERSION} available"
    else
        echo "FAIL tool-mbridge-python Python 3.12+ required (found ${PYTHON_VERSION})"
    fi
else
    echo "FAIL tool-mbridge-python Python 3.12+ required"
fi

if tesseract --version >/dev/null 2>&1; then
    echo "PASS tool-mbridge-ocr tesseract installed"
else
    echo "FAIL tool-mbridge-ocr tesseract not installed. Run: brew install tesseract"
fi

exit 0
