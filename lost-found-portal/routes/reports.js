const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const { authenticate } = require('../middleware/auth');
const { findMatches } = require('../utils/matching');

const router = express.Router();
const db = new Database(path.join(__dirname, '../db/lostfound.db'));

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files (jpeg, png, gif, webp) are allowed'));
  }
});

const CATEGORIES = ['Electronics', 'Documents', 'Keys', 'Bags & Wallets', 'Clothing', 'Jewelry', 'ID Cards', 'Books', 'Other'];

// GET categories
router.get('/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

// SUBMIT NEW REPORT
router.post('/', authenticate, upload.single('photo'), (req, res) => {
  try {
    const { type, category, title, description, location } = req.body;

    if (!type || !['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "lost" or "found".' });
    }
    if (!category || !title || !description || !location) {
      return res.status(400).json({ error: 'Category, title, description and location are required.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db.prepare(`
      INSERT INTO reports (user_id, type, category, title, description, location, photo_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type, category, title.trim(), description.trim(), location.trim(), photoPath);

    const newReportId = result.lastInsertRowid;
    const newReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(newReportId);

    // AI Matching
    const allReports = db.prepare('SELECT * FROM reports WHERE status = ?').all('Open');
    const matches = findMatches(newReport, allReports, 0.22);

    // Store top matches
    const insertMatch = db.prepare(`
      INSERT OR IGNORE INTO matches (report_id, matched_report_id, similarity_score)
      VALUES (?, ?, ?)
    `);

    matches.slice(0, 10).forEach(m => {
      insertMatch.run(newReportId, m.report.id, m.score);
      // Also store reverse for the other report
      insertMatch.run(m.report.id, newReportId, m.score);
    });

    // Enrich matches with full report + owner info (limited)
    const enriched = matches.slice(0, 5).map(m => {
      const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(m.report.user_id);
      return {
        id: m.report.id,
        type: m.report.type,
        category: m.report.category,
        title: m.report.title,
        description: m.report.description,
        location: m.report.location,
        photo_path: m.report.photo_path,
        status: m.report.status,
        created_at: m.report.created_at,
        similarity_score: m.score,
        owner_name: owner ? owner.name : 'Unknown'
      };
    });

    res.status(201).json({
      message: 'Report submitted successfully.',
      report: {
        ...newReport,
        photo_path: newReport.photo_path
      },
      suggestedMatches: enriched
    });
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('image')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// GET MY REPORTS
router.get('/my', authenticate, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM matches m WHERE m.report_id = r.id) as match_count
      FROM reports r
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id);

    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// GET SUGGESTED MATCHES FOR A REPORT
router.get('/:id/matches', authenticate, (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Owner or admin can view
    if (report.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to view matches for this report.' });
    }

    const matchRows = db.prepare(`
      SELECT m.similarity_score, r.*, u.name as owner_name
      FROM matches m
      JOIN reports r ON r.id = m.matched_report_id
      JOIN users u ON u.id = r.user_id
      WHERE m.report_id = ?
      ORDER BY m.similarity_score DESC
    `).all(req.params.id);

    res.json({ matches: matchRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch matches.' });
  }
});

// BROWSE / FILTER OPEN REPORTS (public for logged-in users)
router.get('/', authenticate, (req, res) => {
  try {
    const { type, category, q, status } = req.query;
    let sql = `
      SELECT r.id, r.type, r.category, r.title, r.description, r.location, 
             r.photo_path, r.status, r.created_at, u.name as owner_name
      FROM reports r
      JOIN users u ON u.id = r.user_id
      WHERE 1=1
    `;
    const params = [];

    // Default: only open reports unless admin or specific status
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    } else if (!req.user.is_admin) {
      sql += " AND r.status = 'Open'";
    }

    if (type && ['lost', 'found'].includes(type)) {
      sql += ' AND r.type = ?';
      params.push(type);
    }
    if (category) {
      sql += ' AND r.category = ?';
      params.push(category);
    }
    if (q) {
      sql += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.location LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT 100';

    const reports = db.prepare(sql).all(...params);
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// GET SINGLE REPORT
router.get('/:id', authenticate, (req, res) => {
  try {
    const report = db.prepare(`
      SELECT r.*, u.name as owner_name, u.email as owner_email
      FROM reports r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Hide email from non-owners/non-admins
    if (report.user_id !== req.user.id && !req.user.is_admin) {
      delete report.owner_email;
    }

    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// UPDATE STATUS
router.patch('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Open', 'Matched', 'Returned'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Open, Matched or Returned.' });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    if (report.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the owner or an admin can update status.' });
    }

    db.prepare(`
      UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, req.params.id);

    const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    res.json({ message: 'Status updated.', report: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// DELETE REPORT (owner or admin)
router.delete('/:id', authenticate, (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    if (report.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    // Delete photo if exists
    if (report.photo_path) {
      const photoFile = path.join(__dirname, '../public', report.photo_path);
      if (fs.existsSync(photoFile)) fs.unlinkSync(photoFile);
    }

    db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);
    res.json({ message: 'Report deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

module.exports = router;
