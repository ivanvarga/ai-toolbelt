# lmstudio-vision-mcp

An HTTP MCP bridge that exposes an **LM Studio** model (vision + thinking) as MCP tools.

LM Studio is an MCP *host* and an OpenAI-compatible REST server — it is **not** an MCP
server itself. This bridge wraps its `/v1/chat/completions` endpoint and speaks MCP
(Streamable HTTP) so Claude Code can use the local model, exactly like the forgetful MCP.

Run it **on the box that runs LM Studio** (e.g. `192.168.2.104`), next to forgetful.

## Tools

- `ask(prompt, system?, model?)` — text question; returns the answer and any `<thinking>`.
- `analyze_image(image, prompt, model?)` — vision. `image` is an http(s) URL, a `data:` URL,
  or a local file path **readable by the box running this bridge** (not the client machine).
- `list_models()` — model ids currently loaded in LM Studio.

## Configuration (env)

| var | default | notes |
|-----|---------|-------|
| `LMSTUDIO_BASE_URL` | `http://localhost:1234/v1` | LM Studio's OpenAI API. Use `localhost` when run on the box. |
| `LMSTUDIO_MODEL` | first non-embedding model from `/v1/models` | pin a specific model id if you want |
| `PORT` | `8021` | forgetful uses 8020; this uses 8021 |
| `HOST` | `0.0.0.0` | bind on all interfaces so LAN clients can reach it |
| `MCP_PATH` | `/mcp` | endpoint path |

## Deploy on the box

```bash
# 1. get the code on the box (clone the repo, or copy this folder)
git clone https://github.com/ivanvarga/ai-toolbelt.git
cd ai-toolbelt/tools/lmstudio-vision-mcp

# 2. install deps
npm ci

# 3. run (defaults are fine on the box; LM Studio must be serving on :1234)
node server.js
# -> lmstudio-vision-mcp listening on http://0.0.0.0:8021/mcp -> http://localhost:1234/v1
```

Keep it running with launchd — copy `com.tb.lmstudio-vision-mcp.plist` to
`~/Library/LaunchAgents/`, fix the two absolute paths (your `node` and this `server.js`),
then:

```bash
launchctl load -w ~/Library/LaunchAgents/com.tb.lmstudio-vision-mcp.plist
```

## Register the client (each machine / each Claude config)

```bash
claude mcp add --transport http lmstudio-vision http://192.168.2.104:8021/mcp --scope user
```

(Already done for `~/.claude` and `~/.claude-duel`.) Until the box service is running,
Claude Code will show this server as disconnected.

## Verify

With the bridge running locally for a smoke test:

```bash
LMSTUDIO_BASE_URL=http://192.168.2.104:1234/v1 PORT=8099 HOST=127.0.0.1 node server.js &
PORT=8099 node smoke-test.mjs   # exercises tools/list, list_models, ask, analyze_image
```

## Image locality note

Because the bridge runs on the box, `analyze_image` resolves file paths **on the box**.
For images that live on the client machine (e.g. local screenshots), pass an http(s) URL
or a `data:` URL instead of a path.
