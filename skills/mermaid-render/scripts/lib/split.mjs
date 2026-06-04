// Split a large flowchart model into an overview + per-group diagrams so each
// reads well at a fixed size (no zoom needed). Returns [{ heading, model }].
// Small models, or models without multiple groups, pass through unsplit.
export function splitFlowchart(model, threshold = 25) {
  const nodes = model.nodes || [];
  const groups = model.groups || [];
  if (nodes.length <= threshold || groups.length <= 1) {
    return [{ heading: null, model }];
  }

  const groupOf = new Map();
  for (const g of groups) for (const id of g.nodeIds || []) groupOf.set(id, g.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Overview: one node per group; one edge per distinct cross-group dependency.
  const overviewNodes = groups.map((g) => ({
    id: g.id,
    label: `${g.label} (${(g.nodeIds || []).length})`,
    shape: "action",
    category: "neutral",
  }));
  const seen = new Set();
  const overviewLinks = [];
  for (const l of model.links || []) {
    const a = groupOf.get(l.from);
    const b = groupOf.get(l.to);
    if (!a || !b || a === b) continue;
    const key = `${a}->${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    overviewLinks.push({ from: a, to: b, type: "neutral" });
  }

  const out = [{
    heading: "Overview",
    model: { type: "flowchart", direction: model.direction || "LR", nodes: overviewNodes, links: overviewLinks },
  }];

  // One diagram per group: intra-group nodes + intra-group edges only.
  for (const g of groups) {
    const ids = new Set(g.nodeIds || []);
    const gNodes = (g.nodeIds || []).map((id) => byId.get(id)).filter(Boolean);
    const gLinks = (model.links || []).filter((l) => ids.has(l.from) && ids.has(l.to));
    out.push({
      heading: g.label,
      model: { type: "flowchart", direction: "TD", nodes: gNodes, links: gLinks },
    });
  }
  return out;
}
