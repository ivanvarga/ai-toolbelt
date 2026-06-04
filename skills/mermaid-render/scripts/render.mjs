#!/usr/bin/env node
import { renderFlowchart } from "./renderers/flowchart.mjs";
import { renderClass } from "./renderers/class.mjs";
import { renderEr } from "./renderers/er.mjs";
import { splitFlowchart } from "./lib/split.mjs";

const RENDERERS = { flowchart: renderFlowchart, class: renderClass, er: renderEr };

function fail(msg) {
  process.stderr.write(`[mermaid-render] ${msg}\n`);
  process.exit(1);
}

// model + options -> markdown string (one or more fenced blocks under ### headings)
export function renderToMarkdown(model, { split = false, threshold = 25 } = {}) {
  const render = RENDERERS[model.type];
  if (!render) throw new Error(`unknown model type "${model.type}"; supported: flowchart, class, er`);

  if (split && model.type === "flowchart") {
    const parts = splitFlowchart(model, threshold);
    if (parts.length === 1 && !parts[0].heading) return render(model);
    return parts.map((p) => `### ${p.heading}\n\n${render(p.model)}`).join("\n\n");
  }
  return render(model);
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

// CLI mode only when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const split = args.includes("--split");
  const tIdx = args.indexOf("--threshold");
  const threshold = tIdx >= 0 ? Number(args[tIdx + 1]) : 25;

  const raw = await readStdin();
  if (!raw.trim()) fail("no input on stdin; expected a JSON model");

  let model;
  try {
    model = JSON.parse(raw);
  } catch (e) {
    fail(`invalid JSON on stdin: ${e.message}`);
  }

  try {
    process.stdout.write(renderToMarkdown(model, { split, threshold }) + "\n");
  } catch (e) {
    fail(e.message);
  }
}
