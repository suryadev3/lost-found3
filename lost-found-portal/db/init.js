const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'lostfound.db');

// Remove old db for clean start (comment out if you want to keep data)
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed old database.');
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    register_no TEXT UNIQUE,
    roll_no INTEGER,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('lost', 'found')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    photo_path TEXT,
    status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Matched', 'Returned')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    matched_report_id INTEGER NOT NULL,
    similarity_score REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_report_id) REFERENCES reports(id) ON DELETE CASCADE,
    UNIQUE(report_id, matched_report_id)
  );

  CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
  CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
  CREATE INDEX IF NOT EXISTS idx_users_register ON users(register_no);
`);

// Create default admin
const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
const hashed = bcrypt.hashSync(adminPassword, 10);

db.prepare(`
  INSERT INTO users (name, email, password, is_verified, is_admin)
  VALUES (?, ?, ?, 1, 1)
`).run('System Admin', adminEmail, hashed);

console.log('Database initialized successfully!');
console.log(`Admin account: ${adminEmail} / ${adminPassword}`);
console.log('Database file:', dbPath);

db.close();
