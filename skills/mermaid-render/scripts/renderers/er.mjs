import { classDefLines, escapeLabel, fence } from "../lib/style.mjs";
import { erLink } from "../lib/links.mjs";

export function renderEr(model) {
  const nodes = model.nodes || [];
  const links = model.links || [];
  const lines = ["erDiagram"];

  for (const n of nodes) {
    const attrs = n.attributes || [];
    if (attrs.length === 0) {
      lines.push(`    ${n.id} {}`);
    } else {
      lines.push(`    ${n.id} {`);
      for (const a of attrs) {
        const key = a.key ? ` ${a.key}` : "";
        lines.push(`        ${a.type || "string"} ${a.name}${key}`);
      }
      lines.push("    }");
    }
  }

  for (const l of links) {
    const conn = erLink(l.type || "one-to-many", l.identifying !== false);
    const label = l.label ? `"${escapeLabel(l.label)}"` : '""';
    lines.push(`    ${l.from} ${conn} ${l.to} : ${label}`);
  }

  for (const cd of classDefLines()) lines.push(`    ${cd}`);
  for (const n of nodes) {
    const cat = n.category || "neutral";
    if (cat === "neutral") continue;
    lines.push(`    ${n.id}:::${cat}`);
  }

  return fence(lines.join("\n"));
}
