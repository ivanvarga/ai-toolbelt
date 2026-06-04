#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { renderToMarkdown } from "./render.mjs";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const out = arg("--out", "/tmp/mermaid-render-view.md");
const title = arg("--title", null);

const raw = await readStdin();
let model;
try { model = JSON.parse(raw); }
catch (e) { process.stderr.write(`[mermaid-render] invalid JSON: ${e.message}\n`); process.exit(1); }

let md = title ? `# ${title}\n\n` : "";
try { md += renderToMarkdown(model, { split: true }) + "\n"; }
catch (e) { process.stderr.write(`[mermaid-render] ${e.message}\n`); process.exit(1); }

writeFileSync(out, md);
process.stderr.write(`[mermaid-render] wrote ${out}\n`);

if (process.env.MERMAID_VIEW_NO_OPEN !== "1") {
  try { execFileSync("cmux", ["markdown", "open", out, "--focus", "true"], { stdio: "inherit" }); }
  catch (e) { process.stderr.write(`[mermaid-render] cmux open failed: ${e.message}\n`); }
}
