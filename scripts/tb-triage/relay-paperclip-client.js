const crypto = require('node:crypto');

function signPaperclip(timestamp, body, secret) {
  const mac = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

async function withTimeout(fn, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fn(ac.signal);
  } finally {
    clearTimeout(t);
  }
}

async function fireRoutine(publicId, bodyObject, { apiBase, signingKey }) {
  const rawBody = JSON.stringify(bodyObject);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPaperclip(timestamp, rawBody, signingKey);
  const url = `${apiBase}/api/routine-triggers/public/${encodeURIComponent(publicId)}/fire`;

  const res = await withTimeout(
    (signal) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-paperclip-signature': signature,
        },
        body: rawBody,
        signal,
      }),
    10000
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`paperclip fire rejected: HTTP ${res.status}`);
    err.cause = text.slice(0, 500);
    throw err;
  }
  return res.json();
}

async function listProjects({ apiBase, apiKey, companyId }) {
  const url = `${apiBase}/api/companies/${encodeURIComponent(companyId)}/projects`;
  const res = await withTimeout(
    (signal) =>
      fetch(url, {
        headers: { authorization: `Bearer ${apiKey}` },
        signal,
      }),
    10000
  );
  if (!res.ok) throw new Error(`paperclip listProjects: HTTP ${res.status}`);
  return res.json();
}

module.exports = { fireRoutine, listProjects, signPaperclip };
