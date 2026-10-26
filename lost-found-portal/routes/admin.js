const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const db = new Database(path.join(__dirname, '../db/lostfound.db'));

// All admin routes require auth + admin
router.use(authenticate, requireAdmin);

// DASHBOARD STATS
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalReports = db.prepare('SELECT COUNT(*) as c FROM reports').get().c;
    const openReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'Open'").get().c;
    const matched = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'Matched'").get().c;
    const returned = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'Returned'").get().c;
    const lost = db.prepare("SELECT COUNT(*) as c FROM reports WHERE type = 'lost'").get().c;
    const found = db.prepare("SELECT COUNT(*) as c FROM reports WHERE type = 'found'").get().c;

    res.json({
      totalUsers,
      totalReports,
      openReports,
      matched,
      returned,
      lost,
      found
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET ALL REPORTS (any status)
router.get('/reports', (req, res) => {
  try {
    const { status, type, q } = req.query;
    let sql = `
      SELECT r.*, u.name as owner_name, u.email as owner_email
      FROM reports r
      JOIN users u ON u.id = r.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (type) {
      sql += ' AND r.type = ?';
      params.push(type);
    }
    if (q) {
      sql += ' AND (r.title LIKE ? OR r.description LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT 200';

    const reports = db.prepare(sql).all(...params);
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// GET ALL USERS
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, is_verified, is_admin, created_at,
        (SELECT COUNT(*) FROM reports WHERE user_id = users.id) as report_count
      FROM users
      ORDER BY created_at DESC
    `).all();
    res.json({ users: users.map(u => ({ ...u, is_admin: !!u.is_admin, is_verified: !!u.is_verified })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// UPDATE ANY REPORT (admin)
router.patch('/reports/:id', (req, res) => {
  try {
    const { status, title, description, location, category } = req.body;
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const updates = [];
    const params = [];

    if (status && ['Open', 'Matched', 'Returned'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description) { updates.push('description = ?'); params.push(description); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (category) { updates.push('category = ?'); params.push(category); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT r.*, u.name as owner_name FROM reports r
      JOIN users u ON u.id = r.user_id WHERE r.id = ?
    `).get(req.params.id);

    res.json({ message: 'Report updated.', report: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

// DELETE REPORT (admin)
router.delete('/reports/:id', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);
    res.json({ message: 'Report deleted by admin.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

module.exports = router;
