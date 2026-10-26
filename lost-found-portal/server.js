require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure DB exists
const dbPath = path.join(__dirname, 'db/lostfound.db');
if (!fs.existsSync(dbPath)) {
  console.log('Database not found. Initializing...');
  require('./db/init.js');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (frontend + uploads)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lost & Found Portal API is running', time: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 5MB).' });
  }
  if (err.message && (err.message.includes('image') || err.message.includes('Only'))) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Lost & Found Portal running at http://localhost:${PORT}`);
  console.log(`   Admin login: ${process.env.ADMIN_EMAIL || 'admin@college.edu'} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log(`   (Verification & reset codes appear in this console)\n`);
});
