'use strict';

const {
  DEFAULT_CHANNELS,
  getSettings,
  updateSettings,
  promoteNow,
  listLogs,
} = require('../services/promotionAutomation');

const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!ADMIN_TOKEN) return true;

  const header = String(req.headers.authorization || '');
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const token = String(req.headers['x-admin-token'] || bearer || '').trim();
  return token && token === ADMIN_TOKEN;
}

function handleUnauthorized(res) {
  sendJSON(res, 401, {
    success: false,
    error: 'Unauthorized',
    data: null,
    timestamp: new Date().toISOString(),
  });
}

function handleGetAutomationConfig(req, res) {
  if (!isAuthorized(req)) return handleUnauthorized(res);

  sendJSON(res, 200, {
    success: true,
    error: null,
    data: {
      channels_supported: DEFAULT_CHANNELS,
      settings: getSettings(),
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleUpdateAutomationConfig(req, res) {
  if (!isAuthorized(req)) return handleUnauthorized(res);

  try {
    const body = await parseBody(req);
    const settings = updateSettings(body);
    sendJSON(res, 200, {
      success: true,
      error: null,
      data: settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendJSON(res, 400, {
      success: false,
      error: error.message || 'Unable to update automation settings',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handlePromoteNow(req, res) {
  if (!isAuthorized(req)) return handleUnauthorized(res);

  try {
    const body = await parseBody(req);
    if (Object.keys(body).length > 0) {
      updateSettings(body);
    }
    const promotion = await promoteNow('manual');
    sendJSON(res, 200, {
      success: true,
      error: null,
      data: promotion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendJSON(res, 400, {
      success: false,
      error: error.message || 'Promotion failed',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}

function handleGetAutomationLogs(req, res) {
  if (!isAuthorized(req)) return handleUnauthorized(res);

  let limit = 20;
  try {
    const parsed = new URL(req.url, 'http://localhost');
    limit = Number(parsed.searchParams.get('limit') || 20);
  } catch {
    limit = 20;
  }

  sendJSON(res, 200, {
    success: true,
    error: null,
    data: listLogs(limit),
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  handleGetAutomationConfig,
  handleUpdateAutomationConfig,
  handlePromoteNow,
  handleGetAutomationLogs,
};
