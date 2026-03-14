#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if mbridge --version >/dev/null 2>&1 && python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null && tesseract --version >/dev/null 2>&1; then
    echo "PASS tool-mbridge mbridge CLI, Python 3.12+, tesseract installed"
else
    MISSING=""
    mbridge --version >/dev/null 2>&1 || MISSING="mbridge"
    python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null || MISSING="${MISSING:+$MISSING, }Python 3.12+"
    tesseract --version >/dev/null 2>&1 || MISSING="${MISSING:+$MISSING, }tesseract"
    echo "FAIL tool-mbridge Missing: ${MISSING}. Run: node ${PLUGIN_ROOT}/tools/mbridge/setup.js"
fi
exit 0
