'use strict';

/**
 * services/socialBot.js
 *
 * Automates social media promotion and reward tracking for HashUtopia.
 *
 * Public API:
 *   triggerSocialReward(userId, platform, proofUrl) → { success, data?, error? }
 *   generateMessage(platform, context)              → string | null
 *   broadcastAnnouncement(type)                     → { [platform]: string }
 *   startScheduler()                                → void
 *   stopScheduler()                                 → void
 */

const db = require('../database');
const { getReward, getAllRewards } = require('../utils/rewards');

const REWARD_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const PLATFORM_URL       = process.env.PLATFORM_URL || 'https://hashutopia.com';

// ─────────────────────────────────────────────
// Message templates
// Each template is a function(context) → string.
// context shape: { title, description, url, price }
// ─────────────────────────────────────────────

const MESSAGE_TEMPLATES = {
  /** Twitter: hard 280-character limit */
  twitter({ title, url }) {
    const msg = `🚀 ${title} — Earn HSHU tokens by mining, sharing & playing on HashUtopia! 👇 ${url} #HashUtopia #HSHU #Crypto #DeFi`;
    // '…' is 1 character; slice to 279 so total length is exactly 280.
    return msg.length <= 280 ? msg : msg.slice(0, 279) + '…';
  },

  /** Telegram: markdown format */
  telegram({ title, description, url, price }) {
    return (
      `*🔥 HashUtopia Update*\n\n` +
      `*${title}*\n` +
      `${description}\n\n` +
      `💰 *HSHU Price:* \`${price}\`\n` +
      `🔗 [Open HashUtopia](${url})\n\n` +
      `_Earn rewards by sharing, mining, and participating in the HashUtopia ecosystem._`
    );
  },

  /** Discord: embed-style plain text */
  discord({ title, description, url, price }) {
    return (
      `**📢 HashUtopia Announcement**\n` +
      `${'━'.repeat(36)}\n` +
      `**${title}**\n` +
      `${description}\n\n` +
      `💰 **HSHU Price:** ${price}\n` +
      `🔗 **Link:** <${url}>\n` +
      `${'━'.repeat(36)}`
    );
  },

  /** Facebook */
  facebook({ title, description, url }) {
    return `🌐 ${title}\n\n${description}\n\nJoin HashUtopia and start earning HSHU tokens today!\n👉 ${url}`;
  },

  /** Reddit: markdown */
  reddit({ title, description, url }) {
    return (
      `## ${title}\n\n` +
      `${description}\n\n` +
      `Check it out: ${url}\n\n` +
      `*Posted automatically by the HashUtopia social bot.*`
    );
  },

  /** Instagram: caption with hashtags */
  instagram({ title, url }) {
    return `🚀 ${title}\n\nEarn HSHU tokens on HashUtopia! Link in bio 🔗\n\n#HashUtopia #HSHU #Crypto #Blockchain #DeFi #Earn\n${url}`;
  },

  /** YouTube: video description */
  youtube({ title, description, url }) {
    return (
      `${title}\n\n` +
      `${description}\n\n` +
      `🔗 Visit HashUtopia: ${url}\n\n` +
      `#HashUtopia #HSHU #Cryptocurrency #DeFi #Blockchain`
    );
  },

  /** Twitch: chat command / panel text */
  twitch({ title, url }) {
    return `!shoutout HashUtopia — ${title} | Earn HSHU: ${url}`;
  },

  /** WhatsApp */
  whatsapp({ title, url }) {
    return `Hey! 👋 Check out HashUtopia — ${title}. Earn HSHU tokens just by sharing! 👉 ${url}`;
  },

  /** Kik */
  kik({ title, url }) {
    return `Check out HashUtopia! ${title} — ${url}`;
  },
};

/**
 * Generate a platform-specific promotional message.
 *
 * @param {string} platform  e.g. 'twitter'
 * @param {object} context   { title, description, url, price }
 * @returns {string|null}
 */
function generateMessage(platform, context) {
  const template = MESSAGE_TEMPLATES[platform];
  if (!template) return null;
  return template(context);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Return true if `userId` already has a social reward for `rewardId`
 * recorded within the last 24 hours (anti-abuse guard).
 */
function hasRecentReward(userId, rewardId) {
  const cutoff = Date.now() - REWARD_COOLDOWN_MS;
  return db.findOne('transactions', {
    user_id:    userId,
    reward_id:  rewardId,
    type:       'social_reward',
    created_at: { $gt: cutoff },
  }) !== null;
}

// ─────────────────────────────────────────────
// Core reward logic
// ─────────────────────────────────────────────

/**
 * Validate a social share and credit the user if all checks pass.
 *
 * Checks performed:
 *   1. Platform must be known.
 *   2. proofUrl must be a well-formed http/https URL.
 *   3. User must not have claimed this platform's reward in the last 24 h.
 *
 * On success:
 *   - Inserts a row in `transactions`.
 *   - Credits HSHU and points in `balances`.
 *
 * @param {number|string} userId
 * @param {string}        platform  e.g. 'twitter'
 * @param {string}        proofUrl  URL proving the share happened
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function triggerSocialReward(userId, platform, proofUrl) {
  const reward = getReward(platform);
  if (!reward) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }

  if (!proofUrl || !isValidUrl(proofUrl)) {
    return { success: false, error: 'A valid http/https proof URL is required' };
  }

  if (hasRecentReward(userId, reward.id)) {
    return {
      success: false,
      error:   `${reward.label} reward already claimed — try again in 24 hours`,
    };
  }

  const tx = db.insert('transactions', {
    user_id:    userId,
    reward_id:  reward.id,
    type:       'social_reward',
    platform:   reward.platform,
    proof_url:  proofUrl,
    amount:     reward.hshu,
    points:     reward.points,
    status:     'completed',
    created_at: Date.now(),
  });

  const balance = db.findOne('balances', { user_id: userId });
  if (balance) {
    db.update(
      'balances',
      { hshu: balance.hshu + reward.hshu, points: balance.points + reward.points },
      { user_id: userId }
    );
  } else {
    db.insert('balances', { user_id: userId, hshu: reward.hshu, points: reward.points });
  }

  return {
    success: true,
    data: {
      transaction_id:  tx.id,
      platform:        reward.platform,
      reward_id:       reward.id,
      hshu_credited:   reward.hshu,
      points_credited: reward.points,
    },
  };
}

// ─────────────────────────────────────────────
// Scheduled announcements
// ─────────────────────────────────────────────

const ANNOUNCEMENT_CONTEXT = {
  mining_plan: {
    title:       'New Mining Plans Available on HashUtopia!',
    description: 'Earn HSHU tokens passively with tiered mining plans. Start with as little as $10.',
    url:         `${PLATFORM_URL}/mining`,
    price:       '0.042 USDT',
  },
  price_alert: {
    title:       'HSHU Price Update: 0.042 USDT',
    description: 'The HashUtopia token (HSHU) is on the move! Check our live charts.',
    url:         `${PLATFORM_URL}/market`,
    price:       '0.042 USDT',
  },
  leaderboard: {
    title:       'HashUtopia Leaderboard — Top Earners This Week',
    description: 'See who is crushing it in the HashUtopia ecosystem. Can you reach the top?',
    url:         `${PLATFORM_URL}/leaderboard`,
    price:       '0.042 USDT',
  },
};

/**
 * Build platform messages for a given announcement type and record
 * the broadcast in the `social_posts` table.
 *
 * @param {'mining_plan'|'price_alert'|'leaderboard'} type
 * @returns {{ [platform]: string }}
 */
function broadcastAnnouncement(type) {
  const context   = ANNOUNCEMENT_CONTEXT[type] ?? ANNOUNCEMENT_CONTEXT.mining_plan;
  const platforms = Object.keys(MESSAGE_TEMPLATES);
  const messages  = {};

  for (const platform of platforms) {
    messages[platform] = generateMessage(platform, context);
  }

  db.insert('social_posts', {
    type:              'bot_announcement',
    announcement_type: type,
    title:             context.title,
    platforms:         JSON.stringify(platforms),
    created_at:        Date.now(),
  });

  console.log(`[SocialBot] Broadcast "${type}" to ${platforms.length} platforms`);
  return messages;
}

// ─────────────────────────────────────────────
// Scheduler
// ─────────────────────────────────────────────

/** Intervals (ms) between each announcement type. */
const SCHEDULE = {
  mining_plan:  6  * 60 * 60 * 1000, //  6 h
  price_alert:  1  * 60 * 60 * 1000, //  1 h
  leaderboard:  12 * 60 * 60 * 1000, // 12 h
};

let _timers = [];

/**
 * Start all scheduled announcement intervals.
 * Each type fires once immediately, then repeats on its configured interval.
 * Calling startScheduler() while already running is a no-op.
 */
function startScheduler() {
  if (_timers.length > 0) return;

  for (const [type, interval] of Object.entries(SCHEDULE)) {
    broadcastAnnouncement(type);
    _timers.push(setInterval(() => broadcastAnnouncement(type), interval));
  }

  console.log('[SocialBot] Scheduler started');
}

/**
 * Stop all scheduled announcement intervals.
 */
function stopScheduler() {
  for (const timer of _timers) clearInterval(timer);
  _timers = [];
  console.log('[SocialBot] Scheduler stopped');
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

module.exports = {
  triggerSocialReward,
  generateMessage,
  broadcastAnnouncement,
  startScheduler,
  stopScheduler,
  MESSAGE_TEMPLATES,
};
