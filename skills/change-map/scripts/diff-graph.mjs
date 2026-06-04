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
process.stdout.write(JSON.stringify(buildModel(dirGroups, fileData), null, 2) + "\n");

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

function statusToCategory(status) {
  if (status === "A") return "new";
  if (status === "D") return "deleted";
  return "modified";
}

function buildModel(dirGroups, fileData) {
  const groups = [];
  const nodes = [];
  for (const [dirLabel, files] of dirGroups) {
    const nodeIds = [];
    for (const filepath of files) {
      const d = fileData.get(filepath);
      const tag = d.status === "A" ? "[+]" : d.status === "D" ? "[-]" : "[M]";
      let label = `${tag} ${basename(filepath)}`;
      for (const sym of d.symbols) {
        label += `\\n${sym.prefix} ${sym.name}()${sym.line ? ` :${sym.line}` : ""}`;
      }
      const firstSym = d.symbols.find((s) => s.prefix === "⊕" || s.prefix === "⊙");
      const url = d.status === "D" ? null : buildFileUrl(filepath, firstSym?.line || 1, d.status);
      nodes.push({ id: d.nodeId, label, shape: "action", category: statusToCategory(d.status), url });
      nodeIds.push(d.nodeId);
    }
    groups.push({ id: makeNodeId("g/" + dirLabel), label: dirLabel, nodeIds });
  }

  const links = [];
  for (const [, d] of fileData) {
    for (const target of d.imports) {
      const td = fileData.get(target);
      if (!td) continue;
      const type = td.status === "D" ? "deleted" : (d.status === "A" || td.status === "A") ? "happy" : "neutral";
      links.push({ from: d.nodeId, to: td.nodeId, type });
    }
  }

  return { type: "flowchart", direction: "TD", groups, nodes, links };
}
