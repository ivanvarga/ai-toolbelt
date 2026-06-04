export const PALETTE = {
  new:      { fill: "#4ade80", stroke: "#22c55e" },
  modified: { fill: "#60a5fa", stroke: "#3b82f6" },
  deleted:  { fill: "#f87171", stroke: "#ef4444" },
};

export const FLOWCHART_INIT =
  "%%{init: {'flowchart': {'wrappingWidth': 9999}, 'themeVariables': {'fontSize': '14px'}}}%%";
export const SUBGRAPH_STYLE = "rx:10,ry:10,fill:#1e293b,stroke:#334155,color:#94a3b8";

export function classDefLines() {
  return Object.entries(PALETTE).map(
    ([cat, c]) => `classDef ${cat} fill:${c.fill},color:#000,stroke:${c.stroke},stroke-width:2px`
  );
}

export function escapeLabel(s) {
  return String(s).replace(/"/g, "&quot;");
}

export function fence(body) {
  return "```mermaid\n" + body + "\n```";
}

export function linksComment(urlMap) {
  if (!urlMap || Object.keys(urlMap).length === 0) return null;
  return `<!-- LINKS: ${JSON.stringify(urlMap)} -->`;
}
