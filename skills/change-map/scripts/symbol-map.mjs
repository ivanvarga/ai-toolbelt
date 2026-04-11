#!/usr/bin/env node
import { execSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(REPO_ROOT);

const base = findBase(process.argv[2]);
if (!base) {
  process.stderr.write("ERROR: No base branch found\n");
  process.exit(1);
}

const remoteUrl = run("git remote get-url origin") || "";
const prInfo = detectPR(remoteUrl);
const changedFiles = gatherChangedFiles(base);

if (changedFiles.size === 0) {
  process.stderr.write("No changed TS/TSX files found\n");
  process.exit(0);
}

const symbols = [];

for (const [filepath, status] of changedFiles) {
  if (/\.json$/.test(filepath)) continue;
  if (status === "D") continue;

  const fullPath = resolve(REPO_ROOT, filepath);
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = extractSymbol(line);
    if (match) {
      const lineNum = i + 1;
      symbols.push({
        name: match.name,
        kind: match.kind,
        exported: match.exported,
        file: filepath,
        line: lineNum,
        url: buildUrl(filepath, lineNum, status),
      });
    }
  }
}

const output = {};
for (const sym of symbols) {
  const key = sym.exported ? sym.name : `${shortFile(sym.file)}:${sym.name}`;
  output[key] = {
    file: sym.file,
    line: sym.line,
    kind: sym.kind,
    url: sym.url,
    label: `${shortFile(sym.file)}: ${sym.name}() :${sym.line}`,
  };
}

process.stdout.write(JSON.stringify(output, null, 2) + "\n");

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

function detectPR(url) {
  try {
    const prJson = run("gh pr view --json number,url");
    if (prJson) {
      const pr = JSON.parse(prJson);
      if (pr.number && pr.url) {
        const m = url.match(/github[^:/]*[:/](.+?)(?:\.git)?$/);
        return { number: pr.number, repo: m ? m[1] : null };
      }
    }
  } catch {}
  return null;
}

function gatherChangedFiles(base) {
  const files = new Map();
  const parse = (output) => {
    for (const line of output.split("\n").filter(Boolean)) {
      const [status, ...rest] = line.split("\t");
      const filepath = rest[rest.length - 1];
      if (!filepath) continue;
      if (!/\.tsx?$/.test(filepath)) continue;
      if (/__generated__|\.generated\./.test(filepath)) continue;
      files.set(filepath, status[0]);
    }
  };
  parse(run(`git diff --name-status ${base}...HEAD`));
  parse(run(`git diff --name-status HEAD`));
  return files;
}

function extractSymbol(line) {
  const patterns = [
    { re: /export\s+default\s+function\s+(\w+)/, kind: "component", exported: true },
    { re: /export\s+(?:async\s+)?function\s+(\w+)/, kind: "function", exported: true },
    { re: /export\s+const\s+(\w+)\s*=/, kind: "const", exported: true },
    { re: /export\s+interface\s+(\w+)/, kind: "interface", exported: true },
    { re: /export\s+type\s+(\w+)/, kind: "type", exported: true },
    { re: /^\s+const\s+(\w+)\s*=\s*async\s*\(/, kind: "async-fn", exported: false },
    { re: /^\s+const\s+(\w+)\s*=\s*async\s*\(\)\s*=>/, kind: "async-fn", exported: false },
    { re: /^\s+const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/, kind: "arrow-fn", exported: false },
    { re: /^\s+(?:async\s+)?function\s+(\w+)/, kind: "function", exported: false },
  ];

  for (const { re, kind, exported } of patterns) {
    const m = line.match(re);
    if (m) {
      const name = m[1];
      if (/^(try|catch|if|else|for|while|switch|return|const|let|var)$/.test(name)) continue;
      return { name, kind, exported };
    }
  }
  return null;
}

function buildUrl(filepath, lineNum, status) {
  if (prInfo?.repo) {
    const hash = createHash("sha256").update(filepath).digest("hex");
    const side = status === "D" ? "L" : "R";
    return `https://github.com/${prInfo.repo}/pull/${prInfo.number}/changes#diff-${hash}${side}${lineNum}`;
  }
  const m = remoteUrl.match(/github[^:/]*[:/](.+?)(?:\.git)?$/);
  if (m) {
    const sha = run("git rev-parse HEAD") || "main";
    return `https://github.com/${m[1]}/blob/${sha}/${filepath}#L${lineNum}`;
  }
  return null;
}

function shortFile(filepath) {
  return filepath.replace(/^src\//, "").replace(/\.(tsx?|js)$/, "");
}
