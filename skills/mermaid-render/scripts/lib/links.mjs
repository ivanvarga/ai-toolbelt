const FLOWCHART_LINKS = {
  happy:   { connector: "-->",  color: "#4ade80", width: "2px" },
  error:   { connector: "-->",  color: "#f87171", width: "2px" },
  deleted: { connector: "-.->", color: "#f87171", width: "2px", dasharray: "5" },
  neutral: { connector: "-->",  color: "#475569", width: "1.5px" },
};

const CLASS_LINKS = {
  inheritance: "<|--",
  composition: "*--",
  aggregation: "o--",
  association: "-->",
  dependency:  "..>",
};

const ER_LINKS = {
  "one-to-one":   "||--||",
  "one-to-many":  "||--o{",
  "many-to-one":  "}o--||",
  "many-to-many": "}o--o{",
};

function warn(msg) {
  process.stderr.write(`[mermaid-render] ${msg}\n`);
}

export function flowchartLink(type) {
  if (FLOWCHART_LINKS[type]) return FLOWCHART_LINKS[type];
  warn(`unknown flowchart link type "${type}", using neutral`);
  return FLOWCHART_LINKS.neutral;
}

export function classLink(type) {
  if (CLASS_LINKS[type]) return CLASS_LINKS[type];
  warn(`unknown class link type "${type}", using association`);
  return CLASS_LINKS.association;
}

export function erLink(type, identifying = true) {
  const base = ER_LINKS[type] || (warn(`unknown er link type "${type}", using one-to-many`), ER_LINKS["one-to-many"]);
  return identifying ? base : base.replace("--", "..");
}
