import zlib from "node:zlib";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// --- minimal solid-color PNG generator (no deps) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function solidPng(w, h, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // bit depth 8, color type 2 (RGB)
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: w }, () => Buffer.from([r, g, b])))]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const port = process.env.PORT || 8099;
const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));

const tools = (await client.listTools()).tools.map((t) => t.name);
console.log("TOOLS:", tools.join(", "));

const models = await client.callTool({ name: "list_models", arguments: {} });
console.log("LIST_MODELS:\n" + models.content[0].text);

const ask = await client.callTool({ name: "ask", arguments: { prompt: "Reply with exactly one word: PONG" } });
console.log("ASK:\n" + ask.content[0].text);

const dataUrl = "data:image/png;base64," + solidPng(64, 64, [220, 20, 20]).toString("base64");
const vis = await client.callTool({
  name: "analyze_image",
  arguments: { image: dataUrl, prompt: "What is the dominant color of this image? Answer in one word." },
});
console.log("ANALYZE_IMAGE (expect red):\n" + vis.content[0].text);

await client.close();
