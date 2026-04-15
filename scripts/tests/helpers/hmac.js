const crypto = require('node:crypto');

function signGithub(body, secret) {
  const mac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${mac}`;
}

function verifyGithub(body, header, secret) {
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = signGithub(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function signJira(body, secret) {
  return signGithub(body, secret);
}

function verifyJira(body, header, secret) {
  return verifyGithub(body, header, secret);
}

function signPaperclip(timestamp, body, secret) {
  const mac = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

function verifyPaperclip(body, header, secret, maxAgeSeconds = 300) {
  if (!header) return false;
  const match = header.match(/^t=(\d+),v1=([a-f0-9]{64})$/);
  if (!match) return false;
  const [, timestamp, mac] = match;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > maxAgeSeconds) return false;
  const expectedMac = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const a = Buffer.from(expectedMac, 'hex');
  const b = Buffer.from(mac, 'hex');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = {
  signGithub,
  verifyGithub,
  signJira,
  verifyJira,
  signPaperclip,
  verifyPaperclip,
};
