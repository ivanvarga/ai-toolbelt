import { classDefLines, escapeLabel, fence, linksComment } from "../lib/style.mjs";
import { classLink } from "../lib/links.mjs";

export function renderClass(model) {
  const nodes = model.nodes || [];
  const links = model.links || [];
  const lines = ["classDiagram"];

  for (const n of nodes) {
    const members = n.members || [];
    if (members.length === 0) {
      lines.push(`    class ${n.id}`);
      continue;
    }
    lines.push(`    class ${n.id}{`);
    for (const m of members) {
      const vis = m.visibility || "+";
      if (m.kind === "method") {
        lines.push(`        ${vis}${m.name}()${m.type ? " " + m.type : ""}`);
      } else {
        lines.push(`        ${vis}${m.name}${m.type ? " " + m.type : ""}`);
      }
    }
    lines.push("    }");
  }

  for (const l of links) {
    const arrow = classLink(l.type || "association");
    const label = l.label ? ` : ${escapeLabel(l.label)}` : "";
    lines.push(`    ${l.from} ${arrow} ${l.to}${label}`);
  }

  for (const cd of classDefLines()) lines.push(`    ${cd}`);
  for (const n of nodes) {
    const cat = n.category || "neutral";
    if (cat === "neutral") continue;
    lines.push(`    cssClass "${n.id}" ${cat}`);
  }

  const urlMap = {};
  for (const n of nodes) {
    if (!n.url) continue;
    lines.push(`    click ${n.id} href "${n.url}" "${escapeLabel(n.id)}"`);
    urlMap[n.id] = n.url;
  }

  let out = fence(lines.join("\n"));
  const comment = linksComment(urlMap);
  if (comment) out += "\n\n" + comment;
  return out;
}
