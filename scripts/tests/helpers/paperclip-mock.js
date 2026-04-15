const http = require('node:http');

function start(port) {
  const state = { lastFire: null, lastIssue: null, workspaces: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (req.method === 'POST' && /^\/api\/routine-triggers\/public\/[^/]+\/fire$/.test(req.url)) {
        state.lastFire = {
          url: req.url,
          body,
          signature: req.headers['x-paperclip-signature'] || null,
          timestamp: Date.now(),
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, runId: 'mock-run-1' }));
        return;
      }
      if (req.method === 'GET' && /^\/api\/companies\/[^/]+\/projects/.test(req.url)) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ projects: [{ id: 'p1', workspaces: state.workspaces }] }));
        return;
      }
      if (req.method === 'POST' && /^\/api\/companies\/[^/]+\/issues/.test(req.url)) {
        state.lastIssue = { body };
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'issue-1', status: 'todo' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        stop: () => new Promise((r) => server.close(() => r())),
        lastFire: () => state.lastFire,
        lastIssue: () => state.lastIssue,
        setWorkspaces: (ws) => { state.workspaces = ws; },
      });
    });
  });
}

module.exports = { start };
