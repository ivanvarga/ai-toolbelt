import { FLOWCHART_INIT, SUBGRAPH_STYLE, classDefLines, escapeLabel, fence, linksComment } from "../lib/style.mjs";
import { flowchartLink } from "../lib/links.mjs";

export function renderFlowchart(model) {
  const dir = model.direction || "TD";
  const nodes = model.nodes || [];
  const links = model.links || [];
  const groups = model.groups || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines = [FLOWCHART_INIT, `flowchart ${dir}`];

  const nodeText = (n) => {
    const label = n.url ? `<u>${escapeLabel(n.label)}</u>` : escapeLabel(n.label);
    return n.shape === "decision" ? `${n.id}{"${label}"}` : `${n.id}("${label}")`;
  };

  const grouped = new Set();
  groups.forEach((g, i) => {
    const sgId = g.id || `sg_${i}`;
    lines.push(`    subgraph ${sgId}["${escapeLabel(g.label || sgId)}"]`);
    for (const nid of g.nodeIds || []) {
      const n = byId.get(nid);
      if (!n) continue;
      grouped.add(nid);
      lines.push(`        ${nodeText(n)}`);
    }
    lines.push("    end");
  });
  for (const n of nodes) if (!grouped.has(n.id)) lines.push(`    ${nodeText(n)}`);

  lines.push("");
  links.forEach((l) => {
    const spec = flowchartLink(l.type || "neutral");
    const label = l.label ? ` |${escapeLabel(l.label)}|` : "";
    lines.push(`    ${l.from} ${spec.connector}${label} ${l.to}`);
  });

  lines.push("");
  for (const cd of classDefLines()) lines.push(`    ${cd}`);
  const byCat = {};
  for (const n of nodes) {
    const cat = n.category || "neutral";
    if (cat === "neutral") continue;
    (byCat[cat] ||= []).push(n.id);
  }
  for (const [cat, ids] of Object.entries(byCat)) lines.push(`    class ${ids.join(",")} ${cat}`);

  if (groups.length) {
    lines.push("");
    groups.forEach((g, i) => lines.push(`    style ${g.id || `sg_${i}`} ${SUBGRAPH_STYLE}`));
  }

  lines.push("");
  lines.push("    linkStyle default stroke:#475569,stroke-width:1.5px");
  links.forEach((l, i) => {
    const spec = flowchartLink(l.type || "neutral");
    let s = `stroke:${spec.color},stroke-width:${spec.width}`;
    if (spec.dasharray) s += `,stroke-dasharray:${spec.dasharray}`;
    lines.push(`    linkStyle ${i} ${s}`);
  });

  const urlMap = {};
  for (const n of nodes) {
    if (!n.url) continue;
    lines.push(`    click ${n.id} "${n.url}" _blank`);
    urlMap[n.id] = n.url;
  }

  let out = fence(lines.join("\n"));
  const comment = linksComment(urlMap);
  if (comment) out += "\n\n" + comment;
  return out;
}
