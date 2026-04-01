#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

FORGETFUL_URL=$(jq -r '.mcpServers.forgetful.url // empty' ~/.claude.json 2>/dev/null)

if [ -z "$FORGETFUL_URL" ]; then
    echo "FAIL forgetful-mcp Forgetful MCP not configured in ~/.claude.json. Run: claude mcp add forgetful --scope user --transport http <url>"
    exit 0
fi

if curl -s -m 3 -o /dev/null -w "" -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"tb-health","version":"0.1.0"}},"id":1}' \
    "$FORGETFUL_URL" 2>/dev/null; then
    echo "PASS forgetful-mcp Forgetful reachable at ${FORGETFUL_URL}"
else
    echo "WARN forgetful-mcp Forgetful configured but unreachable at ${FORGETFUL_URL}"
fi
exit 0
