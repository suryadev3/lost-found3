const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const { findStudent } = require('../utils/students');

const router = express.Router();
const db = new Database(path.join(__dirname, '../db/lostfound.db'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' }
});

// Helper: generate JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: !!user.is_admin,
      name: user.name,
      register_no: user.register_no || null,
      roll_no: user.roll_no || null
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    register_no: user.register_no || null,
    roll_no: user.roll_no || null,
    is_admin: !!user.is_admin
  };
}

// REGISTER – now requires Register Number instead of free name
router.post('/register', authLimiter, (req, res) => {
  try {
    const { register_no, email, password } = req.body;

    if (!register_no || !email || !password) {
      return res.status(400).json({ error: 'Register Number, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate Register Number against official CHE class list
    const student = findStudent(register_no);
    if (!student) {
      return res.status(400).json({
        error: 'Invalid Register Number. Only Computer Hardware Engineering (CHE) students can register.'
      });
    }

    // Check if this register number is already used
    const existingReg = db.prepare('SELECT id FROM users WHERE register_no = ?').get(String(register_no).trim());
    if (existingReg) {
      return res.status(409).json({ error: 'This Register Number is already registered.' });
    }

    // Check if email is already used
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const verificationToken = uuidv4().slice(0, 8).toUpperCase();

    const result = db.prepare(`
      INSERT INTO users (name, register_no, roll_no, email, password, verification_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      student.name,
      String(register_no).trim(),
      student.roll_no,
      email.toLowerCase().trim(),
      hashed,
      verificationToken
    );

    console.log('\n========================================');
    console.log(`VERIFICATION CODE for ${email}: ${verificationToken}`);
    console.log(`Student: ${student.name} (Roll ${student.roll_no})`);
    console.log('========================================\n');

    res.status(201).json({
      message: `Registration successful for ${student.name}. Please verify your email.`,
      userId: result.lastInsertRowid,
      studentName: student.name,
      rollNo: student.roll_no,
      demoVerificationCode: verificationToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// VERIFY EMAIL
router.post('/verify', authLimiter, (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.is_verified) {
      return res.status(400).json({ error: 'Account already verified.' });
    }
    if (user.verification_token !== code.toUpperCase().trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);

    // Refresh user data
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const token = generateToken(updated);

    res.json({
      message: 'Email verified successfully. You are now logged in.',
      token,
      user: formatUser(updated)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// LOGIN
router.post('/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: formatUser(user)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// REQUEST PASSWORD RESET
router.post('/forgot-password', authLimiter, (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.json({ message: 'If that email exists, a reset code has been sent.' });
    }

    const resetToken = uuidv4().slice(0, 8).toUpperCase();
    const expires = Date.now() + 30 * 60 * 1000;

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
      .run(resetToken, expires, user.id);

    console.log('\n========================================');
    console.log(`PASSWORD RESET CODE for ${email}: ${resetToken}`);
    console.log('Valid for 30 minutes');
    console.log('========================================\n');

    res.json({
      message: 'If that email exists, a reset code has been sent (check server console in demo).',
      demoResetCode: resetToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Request failed.' });
  }
});

// RESET PASSWORD
router.post('/reset-password', authLimiter, (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !user.reset_token || user.reset_token !== code.toUpperCase().trim()) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }
    if (Date.now() > user.reset_token_expires) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
      .run(hashed, user.id);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset failed.' });
  }
});

// GET CURRENT USER
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, register_no, roll_no, is_admin, created_at FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: formatUser(user) });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
