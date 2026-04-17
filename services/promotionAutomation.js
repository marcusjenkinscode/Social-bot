'use strict';

const db = require('../database');

const DEFAULT_CHANNELS = ['twitter', 'facebook', 'linkedin', 'reddit', 'telegram', 'discord'];
const DEFAULT_INTERVAL_MINUTES = Number(process.env.PROMOTION_INTERVAL_MINUTES) || 60;
const DEFAULT_SITE_URL = process.env.PLATFORM_URL || 'https://hashutopia.com';

let scheduler = null;

function getDefaultSettings() {
  return {
    site_url: DEFAULT_SITE_URL,
    campaign_title: 'Discover HashUtopia',
    campaign_message: 'Join HashUtopia to earn HSHU through social sharing, mining, and community activity.',
    channels: DEFAULT_CHANNELS,
    webhooks: {},
    auto_promote: true,
    interval_minutes: DEFAULT_INTERVAL_MINUTES,
    updated_at: Date.now(),
  };
}

function normalizeSettings(input = {}) {
  const fallback = getDefaultSettings();
  const channels = Array.isArray(input.channels)
    ? [...new Set(input.channels.map(c => String(c).trim().toLowerCase()).filter(Boolean))]
    : fallback.channels;

  const webhooks = (input.webhooks && typeof input.webhooks === 'object')
    ? Object.entries(input.webhooks).reduce((acc, [channel, endpoint]) => {
      const key = String(channel).trim().toLowerCase();
      if (!key) return acc;
      acc[key] = String(endpoint || '').trim();
      return acc;
    }, {})
    : fallback.webhooks;

  return {
    site_url: String(input.site_url || fallback.site_url).trim(),
    campaign_title: String(input.campaign_title || fallback.campaign_title).trim(),
    campaign_message: String(input.campaign_message || fallback.campaign_message).trim(),
    channels: channels.length ? channels : fallback.channels,
    webhooks,
    auto_promote: typeof input.auto_promote === 'boolean' ? input.auto_promote : fallback.auto_promote,
    interval_minutes: Number.isFinite(Number(input.interval_minutes))
      ? Math.max(1, Number(input.interval_minutes))
      : fallback.interval_minutes,
    updated_at: Date.now(),
  };
}

function getSettings() {
  const stored = db.findOne('automation_settings', {});
  if (!stored) {
    const created = db.insert('automation_settings', getDefaultSettings());
    return normalizeSettings(created);
  }
  return normalizeSettings(stored);
}

function updateSettings(partial) {
  const current = getSettings();
  const merged = normalizeSettings({
    ...current,
    ...partial,
    webhooks: { ...current.webhooks, ...(partial.webhooks || {}) },
  });
  db.delete('automation_settings', {});
  const saved = db.insert('automation_settings', merged);
  restartSchedulerIfEnabled(saved);
  return normalizeSettings(saved);
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildPayload(channel, settings) {
  return {
    channel,
    title: settings.campaign_title,
    message: settings.campaign_message,
    site_url: settings.site_url,
    posted_at: new Date().toISOString(),
  };
}

async function postToWebhook(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Webhook failed (${response.status}): ${body || response.statusText}`);
  }
}

async function deliverToChannel(channel, settings) {
  const webhook = settings.webhooks[channel];
  if (!webhook) {
    return { channel, success: false, reason: 'No webhook configured' };
  }
  if (!isValidUrl(webhook)) {
    return { channel, success: false, reason: 'Invalid webhook URL' };
  }
  if (!isValidUrl(settings.site_url)) {
    return { channel, success: false, reason: 'Invalid site URL' };
  }

  const payload = buildPayload(channel, settings);
  await postToWebhook(webhook, payload);
  return { channel, success: true };
}

function savePromotionLog(source, settings, results) {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  return db.insert('automation_logs', {
    source,
    campaign_title: settings.campaign_title,
    campaign_message: settings.campaign_message,
    site_url: settings.site_url,
    channels: JSON.stringify(settings.channels),
    success_count: successCount,
    failure_count: failureCount,
    results: JSON.stringify(results),
    created_at: Date.now(),
  });
}

async function promoteNow(source = 'manual') {
  const settings = getSettings();
  const channels = settings.channels || [];
  const results = [];

  for (const channel of channels) {
    try {
      const result = await deliverToChannel(channel, settings);
      results.push(result);
    } catch (error) {
      results.push({ channel, success: false, reason: error.message || 'Delivery failed' });
    }
  }

  const log = savePromotionLog(source, settings, results);
  return {
    settings,
    success_count: log.success_count,
    failure_count: log.failure_count,
    results,
    created_at: log.created_at,
  };
}

function listLogs(limit = 20) {
  const max = Math.max(1, Math.min(100, Number(limit) || 20));
  const all = db.findAll('automation_logs');
  return all
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, max)
    .map(log => ({
      ...log,
      channels: safeParse(log.channels, []),
      results: safeParse(log.results, []),
    }));
}

function safeParse(value, fallback) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function clearScheduler() {
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
}

function restartSchedulerIfEnabled(settings = getSettings()) {
  clearScheduler();
  if (!settings.auto_promote) return;
  scheduler = setInterval(() => {
    promoteNow('scheduler').catch(err => {
      console.error('[Automation] Scheduled promotion failed:', err.message);
    });
  }, Math.max(1, settings.interval_minutes) * 60 * 1000);
}

function initAutomation() {
  const settings = getSettings();
  restartSchedulerIfEnabled(settings);
}

module.exports = {
  DEFAULT_CHANNELS,
  getSettings,
  updateSettings,
  promoteNow,
  listLogs,
  initAutomation,
};
