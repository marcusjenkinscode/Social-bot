'use strict';

/**
 * api/social_share.js
 *
 * HTTP handlers for the /api/social_share route group.
 *
 *   POST /api/social_share
 *     Body: { platform: string, proof_url: string }
 *     Auth: Bearer token (req.user populated by server.js middleware)
 *     Response: { success, data, error, timestamp }
 *
 *   GET /api/social_share/rewards
 *     No auth required.
 *     Response: { success, data: Reward[], error, timestamp }
 */

const { triggerSocialReward } = require('../services/socialBot');
const { getAllRewards }        = require('../utils/rewards');

// ─────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────

/**
 * POST /api/social_share
 *
 * Accepts a social share proof from an authenticated user, calls
 * triggerSocialReward, and returns the credited amounts on success.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse}  res
 */
function handleSocialShare(req, res) {
  const timestamp = new Date().toISOString();

  if (!req.user || !req.user.id) {
    return sendJSON(res, 401, { success: false, data: null, error: 'Unauthorized', timestamp });
  }

  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return sendJSON(res, 400, { success: false, data: null, error: 'Invalid JSON body', timestamp });
    }

    const { platform, proof_url: proofUrl } = body;

    if (!platform) {
      return sendJSON(res, 400, {
        success: false, data: null, error: 'Missing required field: platform', timestamp,
      });
    }
    if (!proofUrl) {
      return sendJSON(res, 400, {
        success: false, data: null, error: 'Missing required field: proof_url', timestamp,
      });
    }

    const result = triggerSocialReward(req.user.id, platform, proofUrl);

    if (!result.success) {
      return sendJSON(res, 400, { success: false, data: null, error: result.error, timestamp });
    }

    return sendJSON(res, 200, { success: true, data: result.data, error: null, timestamp });
  });

  req.on('error', () => {
    sendJSON(res, 500, { success: false, data: null, error: 'Request error', timestamp });
  });
}

/**
 * GET /api/social_share/rewards
 *
 * Returns the full list of social rewards with their point/HSHU values
 * so the front-end can populate the Share & Earn panel without hard-coding.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse}  res
 */
function handleGetRewards(req, res) {
  const timestamp = new Date().toISOString();
  const rewards   = getAllRewards().map(({ id, platform, label, title, points, hshu, icon }) => ({
    id, platform, label, title, points, hshu, icon,
  }));
  sendJSON(res, 200, { success: true, data: rewards, error: null, timestamp });
}

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

module.exports = { handleSocialShare, handleGetRewards };
