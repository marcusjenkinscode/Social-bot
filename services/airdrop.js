'use strict';

/**
 * services/airdrop.js
 *
 * Handles sign-up airdrop rewards.  This module serves as the reference
 * pattern for other reward services (e.g. socialBot.js):
 *   - use db.findOne to guard against duplicate claims
 *   - use db.insert to record the transaction
 *   - use db.findOne / db.insert+update to credit balances
 *   - return { success, data } or { success, error }
 */

const db = require('../database');

const AIRDROP_REWARD_ID = 'airdrop_signup';
const AIRDROP_HSHU     = 100;
const AIRDROP_POINTS   = 50;

/**
 * Credit a one-time sign-up airdrop to `userId`.
 * Idempotent: returns an error if the reward has already been claimed.
 *
 * @param {number|string} userId
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function triggerAirdrop(userId) {
  const existing = db.findOne('transactions', {
    user_id:   userId,
    reward_id: AIRDROP_REWARD_ID,
  });

  if (existing) {
    return { success: false, error: 'Airdrop already claimed' };
  }

  const tx = db.insert('transactions', {
    user_id:    userId,
    reward_id:  AIRDROP_REWARD_ID,
    type:       'airdrop',
    amount:     AIRDROP_HSHU,
    points:     AIRDROP_POINTS,
    status:     'completed',
    created_at: Date.now(),
  });

  const balance = db.findOne('balances', { user_id: userId });
  if (balance) {
    db.update(
      'balances',
      { hshu: balance.hshu + AIRDROP_HSHU, points: balance.points + AIRDROP_POINTS },
      { user_id: userId }
    );
  } else {
    db.insert('balances', { user_id: userId, hshu: AIRDROP_HSHU, points: AIRDROP_POINTS });
  }

  return {
    success: true,
    data: {
      transaction_id: tx.id,
      hshu_credited:  AIRDROP_HSHU,
      points_credited: AIRDROP_POINTS,
    },
  };
}

module.exports = { triggerAirdrop };
