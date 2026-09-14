import * as SQLite from 'expo-sqlite';
import { CATEGORIES } from '../constants/categories';

const DB_NAME = 'expensetracker.db';

let _db = null;

export const getDb = () => {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
  }
  return _db;
};

/**
 * Initialize all tables and seed categories on first run
 */
export const initializeDatabase = () => {
  const db = getDb();

  // Enable WAL mode for better performance
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA foreign_keys = ON;');

  // ── users table ──────────────────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      username      TEXT    NOT NULL,
      password_hash TEXT    NOT NULL,
      monthly_budgets_json TEXT DEFAULT '{}',
      is_verified   INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now'))
    );
  `);

  try {
    db.execSync("ALTER TABLE users ADD COLUMN monthly_budgets_json TEXT DEFAULT '{}';");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE users DROP COLUMN monthly_budget;");
  } catch (e) {
    // Column might already be dropped or not exist
  }


  // ── categories table ─────────────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL,
      icon  TEXT,
      color TEXT,
      user_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.execSync("ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;");
  } catch (e) {
    // Column might already exist
  }

  // ── category_budgets table ───────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS category_budgets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      budget      REAL    NOT NULL CHECK(budget > 0),
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(user_id, category_id)
    );
  `);

  // ── expenses table ────────────────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      category_id    INTEGER NOT NULL DEFAULT 10,
      amount         REAL    NOT NULL CHECK(amount > 0),
      currency       TEXT    NOT NULL DEFAULT 'INR',
      payment_method TEXT    NOT NULL DEFAULT 'Cash',
      description    TEXT,
      date           TEXT    NOT NULL,
      is_recurring   INTEGER NOT NULL DEFAULT 0,
      recurrence_day INTEGER,
      created_at     TEXT    DEFAULT (datetime('now')),
      updated_at     TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  try {
    db.execSync("ALTER TABLE expenses ADD COLUMN payment_method TEXT DEFAULT 'Cash';");
  } catch (e) {
    // Column might already exist
  }

  // ── recurring_log table ───────────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS recurring_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id      INTEGER NOT NULL,
      triggered_month TEXT    NOT NULL,
      triggered_at    TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );
  `);

  // ── payment_methods table ────────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      icon       TEXT,
      color      TEXT,
      user_id    INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed categories if empty
  const count = db.getFirstSync('SELECT COUNT(*) as cnt FROM categories;');
  if (count.cnt === 0) {
    for (const cat of CATEGORIES) {
      db.runSync(
        'INSERT OR IGNORE INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?);',
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }
  }

  // Seed default payment methods if empty
  const pmCount = db.getFirstSync('SELECT COUNT(*) as cnt FROM payment_methods;');
  if (pmCount.cnt === 0) {
    const DEFAULT_PAYMENT_METHODS = [
      { id: 1, name: 'Cash',        icon: '💵', color: '#10B981', sort_order: 0 },
      { id: 2, name: 'UPI',         icon: '📱', color: '#8862F8', sort_order: 1 },
      { id: 3, name: 'Card',        icon: '💳', color: '#3B82F6', sort_order: 2 },
      { id: 4, name: 'Net Banking', icon: '🏦', color: '#F59E0B', sort_order: 3 },
      { id: 5, name: 'Other',       icon: '📦', color: '#6B7280', sort_order: 999 },
    ];
    for (const pm of DEFAULT_PAYMENT_METHODS) {
      db.runSync(
        'INSERT OR IGNORE INTO payment_methods (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?);',
        [pm.id, pm.name, pm.icon, pm.color, pm.sort_order]
      );
    }
  }

  // ── notes table (single-table architecture for notes, checklists, & templates) ──
  db.execSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id              TEXT    PRIMARY KEY,
      user_id         INTEGER NOT NULL DEFAULT 1,
      title           TEXT,
      content         TEXT,
      type            TEXT    DEFAULT 'text',
      folder          TEXT    DEFAULT 'General',
      tags            TEXT    DEFAULT '[]',
      color           TEXT    DEFAULT '#161622',
      is_pinned       INTEGER DEFAULT 0,
      is_archived     INTEGER DEFAULT 0,
      is_trashed      INTEGER DEFAULT 0,
      is_locked       INTEGER DEFAULT 0,
      checklist_data  TEXT    DEFAULT '[]',
      font_family     TEXT    DEFAULT 'Poppins',
      font_size       INTEGER DEFAULT 16,
      text_align      TEXT    DEFAULT 'left',
      ink_color       TEXT    DEFAULT '#0F172A',
      checklist_style TEXT    DEFAULT 'checkbox',
      reminder_at     TEXT,
      created_at      TEXT    DEFAULT (datetime('now')),
      updated_at      TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN font_family TEXT DEFAULT 'Poppins';");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN font_size INTEGER DEFAULT 16;");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN text_align TEXT DEFAULT 'left';");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN ink_color TEXT DEFAULT '#0F172A';");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN checklist_style TEXT DEFAULT 'checkbox';");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN checklist_font_size INTEGER DEFAULT 16;");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.execSync("ALTER TABLE notes ADD COLUMN checklist_ink_color TEXT DEFAULT '#0F172A';");
  } catch (e) {
    // Column might already exist
  }
};

