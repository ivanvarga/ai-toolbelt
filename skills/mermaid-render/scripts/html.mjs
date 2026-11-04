#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToMarkdown } from "./render.mjs";

const TEMPLATE = new URL("../assets/viewer.html", import.meta.url);
const MERMAID_JS = new URL("../vendor/mermaid-11.17.2.min.js", import.meta.url);
const MERMAID_BLOCK = /```mermaid\n([\s\S]*?)\n```/g;

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

function log(msg) {
  process.stderr.write(`[mermaid-render] ${msg}\n`);
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function firstMermaidBlock(text) {
  const blocks = [...text.matchAll(MERMAID_BLOCK)].map((m) => m[1]);
  if (blocks.length > 1) log(`found ${blocks.length} mermaid blocks, using the first`);
  return blocks.length > 0 ? blocks[0] : text.trim();
}

export function toMermaidSource(raw) {
  if (!raw.trim().startsWith("{")) return firstMermaidBlock(raw);
  const model = JSON.parse(raw);
  return firstMermaidBlock(renderToMarkdown(model, { split: false }));
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildHtml(source, title) {
  const values = {
    "{{TITLE}}": escapeHtml(title),
    "{{SOURCE_JSON}}": JSON.stringify(source).replace(/</g, "\\u003c"),
    "{{MERMAID_JS}}": readFileSync(MERMAID_JS, "utf8"),
  };
  return readFileSync(TEMPLATE, "utf8").replace(/\{\{[A-Z_]+\}\}/g, (key) => values[key] ?? key);
}

function tryRun(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function open(file) {
  if (process.env.MERMAID_VIEW_NO_OPEN === "1") return;
  const url = pathToFileURL(file).href;
  if (process.env.CMUX_WORKSPACE_ID && tryRun("cmux", ["browser", "open", url, "--focus", "false"])) {
    log("opened in a cmux browser pane");
    return;
  }
  if (process.platform === "darwin" && tryRun("open", [file])) {
    log("opened in the default browser");
    return;
  }
  log(`open it manually: ${file}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = resolve(arg("--out", "/tmp/mermaid-render-view.html"));
  const title = arg("--title", "Diagram");

  const raw = await readStdin();
  if (!raw.trim()) {
    log("no input on stdin; expected a JSON model or Mermaid source");
    process.exit(1);
  }

  let source;
  try { source = toMermaidSource(raw); }
  catch (e) { log(e.message); process.exit(1); }

  writeFileSync(out, buildHtml(source, title));
  log(`wrote ${out}`);
  open(out);
}
