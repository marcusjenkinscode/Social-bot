'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function tablePath(table) {
  return path.join(DATA_DIR, `${table}.json`);
}

function loadTable(table) {
  const file = tablePath(table);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveTable(table, rows) {
  fs.writeFileSync(tablePath(table), JSON.stringify(rows, null, 2), 'utf8');
}

/**
 * Test whether a row satisfies a where-clause object.
 * Supported operators: $gt, $gte, $lt, $lte, $ne.
 * Plain values use strict equality.
 */
function matches(row, where) {
  if (!where || Object.keys(where).length === 0) return true;
  return Object.entries(where).every(([key, value]) => {
    if (value !== null && typeof value === 'object') {
      if ('$gt'  in value) return row[key] >  value.$gt;
      if ('$gte' in value) return row[key] >= value.$gte;
      if ('$lt'  in value) return row[key] <  value.$lt;
      if ('$lte' in value) return row[key] <= value.$lte;
      if ('$ne'  in value) return row[key] !== value.$ne;
    }
    return row[key] === value;
  });
}

function nextId(rows) {
  if (rows.length === 0) return 1;
  const ids = rows.map(r => (typeof r.id === 'number' ? r.id : 0));
  return Math.max(...ids) + 1;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

const db = {
  /**
   * Return all rows from `table` that satisfy `where`.
   * @param {string} table
   * @param {object} [where={}]
   * @returns {object[]}
   */
  findAll(table, where = {}) {
    return loadTable(table).filter(row => matches(row, where));
  },

  /**
   * Return the first row from `table` that satisfies `where`, or null.
   * @param {string} table
   * @param {object} [where={}]
   * @returns {object|null}
   */
  findOne(table, where = {}) {
    return loadTable(table).find(row => matches(row, where)) ?? null;
  },

  /**
   * Insert `record` into `table`, auto-assigning an integer `id`.
   * @param {string} table
   * @param {object} record
   * @returns {object} The inserted row including its new `id`.
   */
  insert(table, record) {
    const rows = loadTable(table);
    const row  = { id: nextId(rows), ...record };
    rows.push(row);
    saveTable(table, rows);
    return row;
  },

  /**
   * Update all rows in `table` matching `where` with the fields in `updates`.
   * @param {string} table
   * @param {object} updates  Fields to merge into matched rows.
   * @param {object} [where={}]
   * @returns {number} Count of updated rows.
   */
  update(table, updates, where = {}) {
    const rows    = loadTable(table);
    let   count   = 0;
    const updated = rows.map(row => {
      if (matches(row, where)) { count++; return { ...row, ...updates }; }
      return row;
    });
    saveTable(table, updated);
    return count;
  },

  /**
   * Delete all rows in `table` matching `where`.
   * @param {string} table
   * @param {object} [where={}]
   * @returns {number} Count of deleted rows.
   */
  delete(table, where = {}) {
    const rows      = loadTable(table);
    const remaining = rows.filter(row => !matches(row, where));
    saveTable(table, remaining);
    return rows.length - remaining.length;
  },
};

module.exports = db;
