#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if mbridge --version >/dev/null 2>&1 && python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null; then
    echo "PASS tool-mbridge mbridge CLI and Python 3.12+ installed"
else
    MISSING=""
    mbridge --version >/dev/null 2>&1 || MISSING="mbridge"
    python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null || MISSING="${MISSING:+$MISSING, }Python 3.12+"
    echo "FAIL tool-mbridge Missing: ${MISSING}. Run: node ${PLUGIN_ROOT}/tools/mbridge/setup.js"
fi
exit 0
