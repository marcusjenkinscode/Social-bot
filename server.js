'use strict';

/**
 * server.js
 *
 * Vanilla Node.js HTTP server for HashUtopia Social Bot.
 * No Express, no external frameworks.
 *
 * Routes:
 *   GET  /                              → public/dapps/hashsocial/index.html
 *   GET  /api/social_share/rewards      → list all social rewards
 *   POST /api/social_share              → submit share proof (auth required)
 *   GET  /*                             → static files under public/
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { handleSocialShare, handleGetRewards } = require('./api/social_share');
const { startScheduler }                       = require('./services/socialBot');

const PORT       = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ─────────────────────────────────────────────
// Auth middleware (stub — replace with real JWT validation)
// ─────────────────────────────────────────────

/**
 * Derive req.user from the Authorization header.
 * Convention for this demo: `Bearer <userId>` — the raw token is used as
 * the user ID so the server can be exercised with curl without a full
 * auth implementation.
 *
 * @param {http.IncomingMessage} req
 * @returns {{ id: string|number }|null}
 */
function authenticate(req) {
  const header = req.headers['authorization'] ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const numeric = Number(token);
  return { id: Number.isFinite(numeric) ? numeric : token };
}

// ─────────────────────────────────────────────
// Static file helper
// ─────────────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function serveStatic(req, res) {
  const urlPath  = req.url.split('?')[0];
  const resolved = path.resolve(path.join(PUBLIC_DIR, urlPath));

  // Path-traversal guard
  if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== PUBLIC_DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const mime = MIME_TYPES[path.extname(resolved)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  req.user = authenticate(req);

  const { method, url } = req;

  if (method === 'POST' && url === '/api/social_share') {
    return handleSocialShare(req, res);
  }

  if (method === 'GET' && url.startsWith('/api/social_share/rewards')) {
    return handleGetRewards(req, res);
  }

  if (method === 'GET') {
    // Redirect root to the HashSocial dApp index
    if (url === '/' || url === '') {
      req.url = '/dapps/hashsocial/index.html';
    }
    return serveStatic(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found', timestamp: new Date().toISOString() }));
});

server.listen(PORT, () => {
  console.log(`[Server] HashUtopia Social Bot running on http://localhost:${PORT}`);
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });

module.exports = server;
