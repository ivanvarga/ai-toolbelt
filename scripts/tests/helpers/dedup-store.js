const fs = require('node:fs');
const path = require('node:path');

const KEY_PATTERN = /^(gh:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+#\d+|jira:[A-Z][A-Z0-9_]+-\d+)$/;

function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'dedup.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  return { file };
}

function read(store) {
  return JSON.parse(fs.readFileSync(store.file, 'utf8'));
}

function write(store, data) {
  fs.writeFileSync(store.file, JSON.stringify(data, null, 2));
}

function check(store, key) {
  const data = read(store);
  return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
}

function insert(store, key, value) {
  if (!KEY_PATTERN.test(key)) throw new Error(`invalid dedup key: ${key}`);
  const data = read(store);
  data[key] = value;
  write(store, data);
  return value;
}

function remove(store, key) {
  const data = read(store);
  delete data[key];
  write(store, data);
}

function list(store) {
  return read(store);
}

module.exports = { createStore, check, insert, remove, list, KEY_PATTERN };
