const fs = require('node:fs');
const { dedupFile } = require('./paths');

const KEY_PATTERN = /^(gh:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+#\d+|jira:[A-Z][A-Z0-9_]+-\d+)$/;

function readAll() {
  const file = dedupFile();
  if (!fs.existsSync(file)) { fs.writeFileSync(file, '{}', { mode: 0o600 }); return {}; }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeAll(data) {
  fs.writeFileSync(dedupFile(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

function check(key) {
  if (!KEY_PATTERN.test(key)) throw new Error(`invalid dedup key: ${key}`);
  return readAll()[key] ?? null;
}

function insert(key, value) {
  if (!KEY_PATTERN.test(key)) throw new Error(`invalid dedup key: ${key}`);
  const data = readAll();
  if (data[key]) return data[key];
  data[key] = value;
  writeAll(data);
  return value;
}

function remove(key) {
  if (!KEY_PATTERN.test(key)) throw new Error(`invalid dedup key: ${key}`);
  const data = readAll();
  delete data[key];
  writeAll(data);
}

function list() { return readAll(); }

module.exports = { check, insert, remove, list, KEY_PATTERN };
