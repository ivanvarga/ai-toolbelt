#!/usr/bin/env node
const { execSync } = require("child_process");

try {
  execSync("mbridge --help", { stdio: "pipe" });
  console.log("mbridge is already installed.");
  process.exit(0);
} catch {}

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
