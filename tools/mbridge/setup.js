#!/usr/bin/env node
const { execSync } = require("child_process");
const { readFileSync } = require("fs");
const { join } = require("path");

const pyproject = readFileSync(join(__dirname, "pyproject.toml"), "utf8");
const sourceVersion = pyproject.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

let installedVersion;
try {
  const output = execSync("mbridge --version", {
    stdio: "pipe",
    encoding: "utf8",
  });
  installedVersion = output.match(/(\d+\.\d+\.\d+)/)?.[1];
} catch {}

if (installedVersion === sourceVersion) {
  console.log("mbridge is up to date.");
  process.exit(0);
}

try {
  execSync("which uv", { stdio: "pipe" });
} catch {
  console.error(
    "uv is not installed. Install via: curl -LsSf https://astral.sh/uv/install.sh | sh"
  );
  process.exit(1);
}

execSync(`uv tool install "${__dirname}" --force`, { stdio: "inherit" });
console.log("mbridge installed successfully.");
