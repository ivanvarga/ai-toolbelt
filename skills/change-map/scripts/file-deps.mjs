#!/usr/bin/env node
import { execSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { dirname, basename, relative, resolve } from "path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(REPO_ROOT);

const base = findBase(process.argv[2]);
if (!base) {
  process.stderr.write("ERROR: No base branch found\n");
  process.exit(1);
}

const remoteUrl = run("git remote get-url origin") || "";
const commitSha = run("git rev-parse HEAD") || "main";
const prInfo = detectPR(remoteUrl);
const githubPrefix = buildGithubPrefix(remoteUrl, commitSha);

const allFiles = gatherChangedFiles(base);
if (allFiles.size === 0) {
  process.stderr.write("No changed TS/TSX files found\n");
  process.exit(0);
}

const fileData = new Map();
for (const [filepath, status] of allFiles) {
  const fullPath = resolve(REPO_ROOT, filepath);
  const content = status !== "D" && existsSync(fullPath) ? readFileSync(fullPath, "utf8") : null;
  const symbols = getSymbols(filepath, status, base, content);
  const imports = content ? getImportsToChangedFiles(filepath, content, allFiles) : [];
  fileData.set(filepath, { status, symbols, imports, nodeId: makeNodeId(filepath) });
}

const dirGroups = groupByDir(allFiles);
const output = generateMermaid(dirGroups, fileData, githubPrefix);
process.stdout.write(output);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function findBase(explicit) {
  if (explicit) return explicit;
  for (const b of ["origin/dev", "origin/develop", "origin/main", "origin/master"]) {
    if (run(`git rev-parse --verify ${b}`)) return b;
  }
  return null;
}

function detectPR(remoteUrl) {
  try {
    const prJson = run("gh pr view --json number,url");
    if (prJson) {
      const pr = JSON.parse(prJson);
      if (pr.number && pr.url) {
        const m = remoteUrl.match(/github[^:/]*[:/](.+?)(?:\.git)?$/);
        const repo = m ? m[1] : null;
        return { number: pr.number, repo, url: pr.url };
      }
    }
  } catch {}
  return null;
}

function buildGithubPrefix(url, br) {
  const m = url.match(/github[^:/]*[:/](.+?)(?:\.git)?$/);
  return m ? `https://github.com/${m[1]}/blob/${br}` : "";
}

function buildFileUrl(filepath, lineNum, status) {
  if (prInfo?.repo) {
    const hash = createHash("sha256").update(filepath).digest("hex");
    if (/\.json$/.test(filepath)) {
      return `https://github.com/${prInfo.repo}/pull/${prInfo.number}/changes#diff-${hash}`;
    }
    const side = status === "D" ? "L" : "R";
    return `https://github.com/${prInfo.repo}/pull/${prInfo.number}/changes#diff-${hash}${side}${lineNum}`;
  }
  if (githubPrefix) {
    return `${githubPrefix}/${filepath}#L${lineNum}`;
  }
  return null;
}

function gatherChangedFiles(base) {
  const files = new Map();
  const parse = (output) => {
    for (const line of output.split("\n").filter(Boolean)) {
      const [status, ...rest] = line.split("\t");
      const filepath = rest[rest.length - 1];
      if (!filepath) continue;
      if (!/\.(tsx?|json)$/.test(filepath)) continue;
      if (/__generated__|\.generated\./.test(filepath)) continue;
      files.set(filepath, status[0]);
    }
  };
  parse(run(`git diff --name-status ${base}...HEAD`));
  parse(run(`git diff --name-status HEAD`));
  return files;
}

function makeNodeId(filepath) {
  const name = basename(filepath).replace(/\.(tsx?|json)$/, "");
  const parts = dirname(filepath).split("/");
  const dirKey = parts.length > 1 ? parts.slice(-2).join("_") : parts[0];
  return `${dirKey}_${name}`.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
}

function scanExports(content) {
  const exportRe = /export\s+(?:default\s+)?(?:function|const|interface|type|class|enum)\s+([a-zA-Z_]\w*)/;
  const syms = new Map();
  for (const [i, line] of content.split("\n").entries()) {
    const m = line.match(exportRe);
    if (m) syms.set(m[1], i + 1);
  }
  return syms;
}

function getSymbols(filepath, status, base, content) {
  if (/\.json$/.test(filepath)) return [];
  const results = [];

  if (status === "D") {
    const oldContent = run(`git show ${base}:${filepath}`);
    for (const name of scanExports(oldContent).keys()) {
      results.push({ prefix: "⊖", name, line: null });
    }
    return results;
  }

  if (!content) return results;
  const newSyms = scanExports(content);

  const oldContent = run(`git show ${base}:${filepath}`);
  if (status === "A" || !oldContent) {
    for (const [name, lineNum] of newSyms) {
      results.push({ prefix: "⊕", name, line: lineNum });
    }
    return results;
  }

  const oldSyms = scanExports(oldContent);

  for (const [name, lineNum] of newSyms) {
    if (!oldSyms.has(name)) {
      results.push({ prefix: "⊕", name, line: lineNum });
    } else {
      const oldBlock = extractBlock(oldContent, name);
      const newBlock = extractBlock(content, name);
      if (oldBlock !== newBlock) {
        results.push({ prefix: "⊙", name, line: lineNum });
      }
    }
  }

  for (const name of oldSyms.keys()) {
    if (!newSyms.has(name)) {
      results.push({ prefix: "⊖", name, line: null });
    }
  }

  return results;
}

function extractBlock(content, symbolName) {
  const escaped = symbolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`export\\s+(?:default\\s+)?(?:function|const|interface|type|class|enum)\\s+${escaped}[^a-zA-Z0-9_]`);
  const idx = content.search(re);
  if (idx === -1) return "";
  return content.slice(idx, idx + 500);
}

function getImportsToChangedFiles(filepath, content, allFiles) {
  const importRe = /from\s+['"]([^'"]+)['"]/g;
  const results = [];
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const resolved = resolveImport(filepath, m[1], allFiles);
    if (resolved) results.push(resolved);
  }
  return results;
}

function resolveImport(fromFile, importPath, allFiles) {
  let resolved;
  if (importPath.startsWith("~/")) {
    resolved = importPath.slice(2);
  } else if (importPath.startsWith(".")) {
    const dir = dirname(fromFile);
    resolved = relative(REPO_ROOT, resolve(REPO_ROOT, dir, importPath));
  } else {
    return null;
  }

  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = resolved + ext;
    if (allFiles.has(candidate)) return candidate;
  }
  return null;
}

function groupByDir(allFiles) {
  const groups = new Map();
  for (const [filepath] of allFiles) {
    let dir = dirname(filepath);
    if (dir.startsWith("src/")) dir = dir.slice(4);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(filepath);
  }
  for (const [, files] of groups) files.sort();
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function generateMermaid(dirGroups, fileData, ghPrefix) {
  const lines = [];
  lines.push("```mermaid");
  lines.push("%%{init: {'flowchart': {'wrappingWidth': 9999}, 'themeVariables': {'fontSize': '14px'}}}%%");
  lines.push("flowchart TD");

  let sgIdx = 0;
  const sgIds = [];
  for (const [dirLabel, files] of dirGroups) {
    const sgId = `sg_${sgIdx}`;
    sgIds.push(sgId);
    lines.push(`    subgraph ${sgId}["${dirLabel}"]`);
    for (const filepath of files) {
      const d = fileData.get(filepath);
      const tag = d.status === "A" ? "[+]" : d.status === "D" ? "[-]" : "[M]";
      const fname = basename(filepath);
      let label = `<u>${tag} ${fname}</u>`;
      for (const sym of d.symbols) {
        if (sym.prefix === "⊖") {
          label += `\\n${sym.prefix} ${sym.name}`;
        } else {
          label += `\\n${sym.prefix} <u>${sym.name}()${sym.line ? ` :${sym.line}` : ""}</u>`;
        }
      }
      lines.push(`        ${d.nodeId}("${label}")`);
    }
    lines.push("    end");
    sgIdx++;
  }

  lines.push("");

  const linkTypes = [];
  for (const [, d] of fileData) {
    for (const target of d.imports) {
      const td = fileData.get(target);
      if (!td) continue;
      if (td.status === "D") {
        lines.push(`    ${d.nodeId} -.-> ${td.nodeId}`);
        linkTypes.push("deleted");
      } else {
        lines.push(`    ${d.nodeId} --> ${td.nodeId}`);
        linkTypes.push(d.status === "A" || td.status === "A" ? "added" : "existing");
      }
    }
  }

  lines.push("");
  lines.push("    classDef modified fill:#60a5fa,color:#000,stroke:#3b82f6,stroke-width:2px,cursor:pointer");
  lines.push("    classDef added fill:#4ade80,color:#000,stroke:#22c55e,stroke-width:2px,cursor:pointer");
  lines.push("    classDef deleted fill:#f87171,color:#000,stroke:#ef4444,stroke-width:2px,cursor:pointer");
  lines.push("");

  const byClass = { modified: [], added: [], deleted: [] };
  for (const [, d] of fileData) {
    const cls = d.status === "A" ? "added" : d.status === "D" ? "deleted" : "modified";
    byClass[cls].push(d.nodeId);
  }
  if (byClass.modified.length) lines.push(`    class ${byClass.modified.join(",")} modified`);
  if (byClass.added.length) lines.push(`    class ${byClass.added.join(",")} added`);
  if (byClass.deleted.length) lines.push(`    class ${byClass.deleted.join(",")} deleted`);

  lines.push("");
  for (const sgId of sgIds) {
    lines.push(`    style ${sgId} rx:10,ry:10,fill:#1e293b,stroke:#334155,color:#94a3b8`);
  }

  lines.push("");
  lines.push("    linkStyle default stroke:#475569,stroke-width:1.5px");
  const indicesOf = (val) => linkTypes.reduce((acc, t, i) => (t === val ? [...acc, i] : acc), []);
  const existingLinks = indicesOf("existing");
  const addedLinks = indicesOf("added");
  const deletedLinks = indicesOf("deleted");
  if (existingLinks.length) lines.push(`    linkStyle ${existingLinks.join(",")} stroke:#60a5fa,stroke-width:2px`);
  if (addedLinks.length) lines.push(`    linkStyle ${addedLinks.join(",")} stroke:#4ade80,stroke-width:2px`);
  if (deletedLinks.length) lines.push(`    linkStyle ${deletedLinks.join(",")} stroke:#f87171,stroke-width:2px,stroke-dasharray:5`);

  if (ghPrefix) {
    lines.push("");
    for (const [fp, d] of fileData) {
      if (d.status === "D") continue;
      const firstSym = d.symbols.find(s => s.prefix === "⊕" || s.prefix === "⊙");
      const lineNum = firstSym?.line || 1;
      const tooltip = firstSym ? `${firstSym.name}() :${firstSym.line}` : "Open file";
      const url = buildFileUrl(fp, lineNum, d.status);
      if (url) lines.push(`    click ${d.nodeId} "${url}" _blank`);
    }
  }

  lines.push("```");

  if (ghPrefix || prInfo) {
    const fileLinks = {};
    for (const [fp, d] of fileData) {
      if (d.status === "D") continue;
      const firstSym = d.symbols.find(s => s.prefix === "⊕" || s.prefix === "⊙");
      const lineNum = firstSym?.line || 1;
      const tooltip = firstSym ? `${firstSym.name}() :${firstSym.line}` : "Open file";
      const url = buildFileUrl(fp, lineNum, d.status);
      if (url) fileLinks[fp] = { url, tooltip, line: lineNum };
    }
    lines.push("");
    lines.push(`<!-- FILE_LINKS: ${JSON.stringify(fileLinks)} -->`);
  }

  return lines.join("\n") + "\n";
}
