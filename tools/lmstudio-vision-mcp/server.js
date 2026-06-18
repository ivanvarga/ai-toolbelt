#!/usr/bin/env node
// HTTP MCP bridge for an LM Studio (OpenAI-compatible) vision/thinking model.
// LM Studio is an MCP *host* + OpenAI REST server, not an MCP server itself, so this
// wraps its /v1/chat/completions endpoint and exposes MCP tools over Streamable HTTP.
//
// Env:
//   LMSTUDIO_BASE_URL  default http://localhost:1234/v1   (run this next to LM Studio)
//   LMSTUDIO_MODEL     default: first non-embedding model from /v1/models
//   PORT               default 8021
//   HOST               default 0.0.0.0  (so other LAN machines can reach it)
//   MCP_PATH           default /mcp

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const BASE = (process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1").replace(/\/$/, "");
const PORT = Number(process.env.PORT || 8021);
const HOST = process.env.HOST || "0.0.0.0";
const MCP_PATH = process.env.MCP_PATH || "/mcp";

async function pickModel(explicit) {
  if (explicit) return explicit;
  if (process.env.LMSTUDIO_MODEL) return process.env.LMSTUDIO_MODEL;
  try {
    const r = await fetch(`${BASE}/models`);
    const ids = ((await r.json()).data || []).map((m) => m.id);
    return ids.find((id) => !/embed/i.test(id)) || ids[0];
  } catch {
    return "gemma-4-26b-a4b-it-mlx";
  }
}

async function chat(messages, model) {
  const r = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.2, stream: false }),
  });
  if (!r.ok) throw new Error(`LM Studio ${r.status}: ${(await r.text()).slice(0, 500)}`);
  const msg = (await r.json()).choices?.[0]?.message || {};
  const body = (msg.content || "").trim();
  const think = (msg.reasoning_content || "").trim();
  if (think && body) return `<thinking>\n${think}\n</thinking>\n\n${body}`;
  return body || think || "(empty response)";
}

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

async function toImageUrl(image) {
  if (image.startsWith("data:")) return image;
  if (/^https?:\/\//.test(image)) {
    const r = await fetch(image);
    if (!r.ok) throw new Error(`fetch image ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = r.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  // Local path — must be readable by THIS process (i.e. the box running the bridge).
  const buf = await readFile(image);
  const mime = MIME[extname(image).slice(1).toLowerCase()] || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function ok(text) {
  return { content: [{ type: "text", text }] };
}
function fail(e) {
  return { content: [{ type: "text", text: `Error: ${e?.message || e}` }], isError: true };
}

function buildServer() {
  const server = new McpServer({ name: "lmstudio-vision", version: "0.1.0" });

  server.registerTool(
    "ask",
    {
      description:
        "Ask the local LM Studio model a text question; returns its answer and any reasoning. Runs fully local on the LAN — use for private/offline reasoning.",
      inputSchema: {
        prompt: z.string().describe("the question or task"),
        system: z.string().optional().describe("optional system prompt"),
        model: z.string().optional().describe("override the LM Studio model id"),
      },
    },
    async ({ prompt, system, model }) => {
      try {
        const msgs = system ? [{ role: "system", content: system }] : [];
        msgs.push({ role: "user", content: prompt });
        return ok(await chat(msgs, await pickModel(model)));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "analyze_image",
    {
      description:
        "Analyze an image with the local LM Studio vision model. Provide an image as an http(s) URL, a data: URL, or a local file path that THIS server can read (paths are resolved on the machine running the bridge, not the client). Plus a prompt describing what to look for.",
      inputSchema: {
        image: z.string().describe("http(s) URL, data: URL, or local file path readable by the bridge"),
        prompt: z.string().describe("what to ask about the image"),
        model: z.string().optional().describe("override the LM Studio model id"),
      },
    },
    async ({ image, prompt, model }) => {
      try {
        const url = await toImageUrl(image);
        const messages = [
          { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url } }] },
        ];
        return ok(await chat(messages, await pickModel(model)));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "list_models",
    { description: "List model ids currently loaded in LM Studio.", inputSchema: {} },
    async () => {
      try {
        const ids = (((await (await fetch(`${BASE}/models`)).json()).data) || []).map((m) => m.id);
        return ok(ids.join("\n") || "(no models loaded)");
      } catch (e) {
        return fail(e);
      }
    },
  );

  return server;
}

const transports = {};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== MCP_PATH) {
    res.writeHead(404).end("not found");
    return;
  }
  const sid = req.headers["mcp-session-id"];
  try {
    if (req.method === "POST") {
      const body = await readBody(req);
      let transport;
      if (sid && transports[sid]) {
        transport = transports[sid];
      } else if (!sid && isInitializeRequest(body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports[id] = transport;
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) delete transports[transport.sessionId];
        };
        await buildServer().connect(transport);
      } else {
        res.writeHead(400, { "Content-Type": "application/json" }).end(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session" }, id: null }),
        );
        return;
      }
      await transport.handleRequest(req, res, body);
    } else if (req.method === "GET" || req.method === "DELETE") {
      if (!sid || !transports[sid]) {
        res.writeHead(400).end("Invalid or missing session ID");
        return;
      }
      await transports[sid].handleRequest(req, res);
    } else {
      res.writeHead(405).end("Method Not Allowed");
    }
  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" }).end(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: String(e?.message || e) }, id: null }),
      );
    }
  }
}).listen(PORT, HOST, () => {
  console.error(`lmstudio-vision-mcp listening on http://${HOST}:${PORT}${MCP_PATH} -> ${BASE}`);
});
