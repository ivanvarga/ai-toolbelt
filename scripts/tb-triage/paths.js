const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function triageDir() {
  const dir = path.join(os.homedir(), '.paperclip', 'tb-triage');
  if (fs.existsSync(dir)) {
    const st = fs.lstatSync(dir);
    if (st.isSymbolicLink()) throw new Error(`tb-triage dir is a symlink: ${dir}`);
  } else {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

function dedupFile() { return path.join(triageDir(), 'dedup.json'); }
function repoMapFile() { return path.join(triageDir(), 'repo-map.json'); }

module.exports = { triageDir, dedupFile, repoMapFile };
