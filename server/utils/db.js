/**
 * db.js — SQLite persistence layer
 *
 * Tables:
 *   pending_intents      — intents detected on-chain, pending group + settle
 *   pending_settlements  — batch settlement attempts tracking
 *
 * Uses better-sqlite3 (sync API — no async complexity, safe for single-process server).
 */

const Database = require('better-sqlite3')
const path = require('path')

let _db = null

function getDb() {
  if (_db) return _db

  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'sqlite-db', 'ghostlock.db')
  _db = new Database(dbPath)

  // WAL mode: concurrent reads don't block writes
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _initSchema(_db)
  return _db
}

function _initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);

    CREATE TABLE IF NOT EXISTS pending_intents (
      request_id   INTEGER PRIMARY KEY,
      epoch        INTEGER NOT NULL,
      market_id    INTEGER NOT NULL,
      detected_block INTEGER NOT NULL,
      detected_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      processed    INTEGER NOT NULL DEFAULT 0,
      user         TEXT,
      side         INTEGER,
      amount       TEXT,
      limit_price  TEXT,
      is_dummy     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_pi_unprocessed
      ON pending_intents(epoch, market_id)
      WHERE processed = 0;

    CREATE TABLE IF NOT EXISTS pending_settlements (
      batch_key    TEXT PRIMARY KEY,
      epoch        INTEGER NOT NULL,
      market_id    INTEGER NOT NULL,
      request_ids  TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'pending',
      attempts     INTEGER NOT NULL DEFAULT 0,
      last_attempt INTEGER,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_ps_status
      ON pending_settlements(status);
  `)

  const cols = db.prepare("PRAGMA table_info(pending_intents)").all().map(r => r.name)
  if (!cols.includes('user'))        db.exec("ALTER TABLE pending_intents ADD COLUMN user TEXT")
  if (!cols.includes('side'))        db.exec("ALTER TABLE pending_intents ADD COLUMN side INTEGER")
  if (!cols.includes('amount'))       db.exec("ALTER TABLE pending_intents ADD COLUMN amount TEXT")
  if (!cols.includes('limit_price')) db.exec("ALTER TABLE pending_intents ADD COLUMN limit_price TEXT")
  if (!cols.includes('is_dummy'))    db.exec("ALTER TABLE pending_intents ADD COLUMN is_dummy INTEGER DEFAULT 0")
}

// ─── kv (watcher state) ─────────────────────────────────────────────────────

function getKv(key) {
  const row = getDb().prepare(`SELECT value FROM kv WHERE key = ?`).get(key)
  return row ? row.value : null
}

function setKv(key, value) {
  getDb()
    .prepare(`INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, String(value))
}

// ─── pending_intents ───────────────────────────────────────────────────────

/**
 * Record a newly detected intent from the watcher.
 * INSERT OR IGNORE — safe to call multiple times for the same requestId.
 */
function insertIntent(requestId, epoch, marketId, detectedBlock) {
  getDb()
    .prepare(`
      INSERT OR IGNORE INTO pending_intents (request_id, epoch, market_id, detected_block)
      VALUES (?, ?, ?, ?)
    `)
    .run(requestId, epoch, marketId, detectedBlock)
}

/**
 * Fetch up to `limit` unprocessed intents, oldest first.
 * Returns [{request_id, epoch, market_id, detected_block}]
 */
function getPendingIntents(limit = 50) {
  return getDb()
    .prepare(`
      SELECT request_id, epoch, market_id, detected_block
      FROM pending_intents
      WHERE processed = 0
      ORDER BY detected_at ASC
      LIMIT ?
    `)
    .all(limit)
}

/**
 * Mark a single intent as processed (settled or skipped).
 */
function markIntentProcessed(requestId) {
  getDb()
    .prepare(`UPDATE pending_intents SET processed = 1 WHERE request_id = ?`)
    .run(requestId)
}

/**
 * Mark multiple intents processed in one transaction.
 */
function markIntentsProcessed(requestIds) {
  const stmt = getDb().prepare(`UPDATE pending_intents SET processed = 1 WHERE request_id = ?`)
  const tx = getDb().transaction((ids) => ids.forEach(id => stmt.run(id)))
  tx(requestIds)
}

// ─── pending_settlements ────────────────────────────────────────────────────

/**
 * Upsert a settlement batch record.
 * On conflict (same batch_key) increment attempts and update status.
 */
function upsertSettlement(batchKey, epoch, marketId, requestIds, status = 'pending') {
  getDb()
    .prepare(`
      INSERT INTO pending_settlements (batch_key, epoch, market_id, request_ids, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(batch_key) DO UPDATE SET
        status       = excluded.status,
        attempts     = attempts + 1,
        last_attempt = unixepoch()
    `)
    .run(batchKey, epoch, marketId, JSON.stringify(requestIds), status)
}

/**
 * Mark a settlement batch as successfully settled.
 */
function markSettlementDone(batchKey) {
  getDb()
    .prepare(`UPDATE pending_settlements SET status = 'settled', last_attempt = unixepoch() WHERE batch_key = ?`)
    .run(batchKey)
}

/**
 * Get settlements in a given status for monitoring/retry.
 */
function getSettlementsByStatus(status) {
  return getDb()
    .prepare(`SELECT * FROM pending_settlements WHERE status = ? ORDER BY created_at ASC`)
    .all(status)
}

function close() {
  if (_db) {
    _db.close()
    _db = null
  }
}

module.exports = {
  getDb,
  getKv,
  setKv,
  insertIntent,
  getPendingIntents,
  markIntentProcessed,
  markIntentsProcessed,
  upsertSettlement,
  markSettlementDone,
  getSettlementsByStatus,
  close,
}