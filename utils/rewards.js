'use strict';

/**
 * Social reward definitions for all supported platforms.
 * Each entry maps a reward ID to its metadata:
 *   id          – reward identifier stored in the `transactions` table
 *   platform    – lowercase platform key used throughout the codebase
 *   label       – human-readable platform name shown in the UI
 *   points      – social points credited to the user per valid share
 *   hshu        – HSHU tokens credited to the user per valid share
 *   title       – short action title shown in the Share & Earn panel
 *   description – longer description for the platform
 *   icon        – emoji icon used in the UI
 *   url         – canonical platform base URL
 *   maxChars    – maximum character count for a post on this platform
 */
const SOCIAL_REWARDS = {
  social_twitter: {
    id: 'social_twitter',
    platform: 'twitter',
    label: 'Twitter',
    points: 10,
    hshu: 5,
    title: 'Share on Twitter',
    description: 'Tweet about HashUtopia to earn rewards',
    icon: '🐦',
    url: 'https://twitter.com',
    maxChars: 280,
  },
  social_discord: {
    id: 'social_discord',
    platform: 'discord',
    label: 'Discord',
    points: 10,
    hshu: 5,
    title: 'Share on Discord',
    description: 'Share HashUtopia in a Discord server',
    icon: '💬',
    url: 'https://discord.com',
    maxChars: 2000,
  },
  social_telegram: {
    id: 'social_telegram',
    platform: 'telegram',
    label: 'Telegram',
    points: 10,
    hshu: 5,
    title: 'Share on Telegram',
    description: 'Share HashUtopia on Telegram',
    icon: '✈️',
    url: 'https://t.me',
    maxChars: 4096,
  },
  social_facebook: {
    id: 'social_facebook',
    platform: 'facebook',
    label: 'Facebook',
    points: 8,
    hshu: 4,
    title: 'Share on Facebook',
    description: 'Share HashUtopia on Facebook',
    icon: '📘',
    url: 'https://facebook.com',
    maxChars: 63206,
  },
  social_reddit: {
    id: 'social_reddit',
    platform: 'reddit',
    label: 'Reddit',
    points: 12,
    hshu: 6,
    title: 'Post on Reddit',
    description: 'Post about HashUtopia on Reddit',
    icon: '🤖',
    url: 'https://reddit.com',
    maxChars: 40000,
  },
  social_instagram: {
    id: 'social_instagram',
    platform: 'instagram',
    label: 'Instagram',
    points: 8,
    hshu: 4,
    title: 'Share on Instagram',
    description: 'Share HashUtopia on Instagram',
    icon: '📸',
    url: 'https://instagram.com',
    maxChars: 2200,
  },
  social_youtube: {
    id: 'social_youtube',
    platform: 'youtube',
    label: 'YouTube',
    points: 20,
    hshu: 10,
    title: 'Post on YouTube',
    description: 'Create a YouTube video about HashUtopia',
    icon: '▶️',
    url: 'https://youtube.com',
    maxChars: 5000,
  },
  social_twitch: {
    id: 'social_twitch',
    platform: 'twitch',
    label: 'Twitch',
    points: 20,
    hshu: 10,
    title: 'Stream on Twitch',
    description: 'Stream HashUtopia on Twitch',
    icon: '🎮',
    url: 'https://twitch.tv',
    maxChars: 500,
  },
  social_whatsapp: {
    id: 'social_whatsapp',
    platform: 'whatsapp',
    label: 'WhatsApp',
    points: 6,
    hshu: 3,
    title: 'Share on WhatsApp',
    description: 'Share HashUtopia on WhatsApp',
    icon: '📱',
    url: 'https://wa.me',
    maxChars: 65536,
  },
  social_kik: {
    id: 'social_kik',
    platform: 'kik',
    label: 'Kik',
    points: 6,
    hshu: 3,
    title: 'Share on Kik',
    description: 'Share HashUtopia on Kik',
    icon: '💌',
    url: 'https://kik.com',
    maxChars: 1000,
  },
};

/**
 * Look up a reward by its reward ID (e.g. `social_twitter`) or
 * by its platform name (e.g. `twitter`).
 *
 * @param {string} platformOrId
 * @returns {object|null}
 */
function getReward(platformOrId) {
  if (SOCIAL_REWARDS[platformOrId]) return SOCIAL_REWARDS[platformOrId];
  return Object.values(SOCIAL_REWARDS).find(r => r.platform === platformOrId) ?? null;
}

/**
 * Return all reward definitions as an array.
 * @returns {object[]}
 */
function getAllRewards() {
  return Object.values(SOCIAL_REWARDS);
}

module.exports = { SOCIAL_REWARDS, getReward, getAllRewards };
