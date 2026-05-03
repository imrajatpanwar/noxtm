const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const CustomDatabase = require('../models/CustomDatabase');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token) token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    user._id = user._id || user.userId;
    req.user = user;
    next();
  });
};

// Multer — store icons in uploads/custom-db-icons/
const iconDir = path.join(__dirname, '../uploads/custom-db-icons');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, iconDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.svg';
    cb(null, `db_icon_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image/SVG files allowed'));
  },
});

const getUserCompany = async (userId) => {
  const user = await User.findById(userId).select('companyId role');
  if (!user) throw new Error('User not found');
  return user;
};

// ─── GET all custom databases for the company ─────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await getUserCompany(req.user._id);
    const companyId = user.companyId || req.user.companyId;
    if (!companyId) return res.json({ success: true, databases: [] });

    const dbs = await CustomDatabase.find({ companyId })
      .populate('createdBy', 'fullName email profileImage')
      .populate('accessUsers', 'fullName email profileImage')
      .select('-rows')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, databases: dbs });
  } catch (err) {
    console.error('[CustomDB] GET /', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── CREATE a new custom database ─────────────────────────────────────────────
router.post('/', authenticateToken, upload.single('icon'), async (req, res) => {
  try {
    const user = await getUserCompany(req.user._id);
    const companyId = user.companyId || req.user.companyId;
    if (!companyId) return res.status(400).json({ message: 'No company found' });

    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (name.trim().split(/\s+/).length > 3) return res.status(400).json({ message: 'Name must be 3 words or less' });

    const db = new CustomDatabase({
      companyId,
      createdBy: req.user._id,
      name: name.trim(),
      icon: req.file ? req.file.filename : null,
      accessUsers: [],
      columns: [],
      rows: [],
    });

    await db.save();
    await db.populate('createdBy', 'fullName email profileImage');
    res.status(201).json({ success: true, database: db });
  } catch (err) {
    console.error('[CustomDB] POST /', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE database (name, icon, accessUsers) ────────────────────────────────
router.put('/:id', authenticateToken, upload.single('icon'), async (req, res) => {
  try {
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    const { name, accessUsers } = req.body;
    if (name) {
      if (name.trim().split(/\s+/).length > 3) return res.status(400).json({ message: 'Name must be 3 words or less' });
      db.name = name.trim();
    }
    if (accessUsers !== undefined) db.accessUsers = JSON.parse(accessUsers);
    if (req.file) {
      if (db.icon) { const p = path.join(iconDir, db.icon); if (fs.existsSync(p)) fs.unlinkSync(p); }
      db.icon = req.file.filename;
    }

    await db.save();
    await db.populate('createdBy', 'fullName email profileImage');
    await db.populate('accessUsers', 'fullName email profileImage');
    res.json({ success: true, database: db });
  } catch (err) {
    console.error('[CustomDB] PUT /:id', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE a database ────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });
    if (db.icon) { const p = path.join(iconDir, db.icon); if (fs.existsSync(p)) fs.unlinkSync(p); }
    await db.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('[CustomDB] DELETE /:id', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET rows + columns for a database ────────────────────────────────────────
router.get('/:id/rows', authenticateToken, async (req, res) => {
  try {
    const db = await CustomDatabase.findById(req.params.id)
      .populate('accessUsers', 'fullName email profileImage')
      .lean();
    if (!db) return res.status(404).json({ message: 'Database not found' });
    res.json({
      success: true,
      rows: db.rows,
      columns: db.columns || [],
      accessUsers: db.accessUsers,
      name: db.name,
      icon: db.icon,
    });
  } catch (err) {
    console.error('[CustomDB] GET /:id/rows', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── ADD a row ─────────────────────────────────────────────────────────────────
router.post('/:id/rows', authenticateToken, async (req, res) => {
  try {
    const { name, cells } = req.body;
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    db.rows.push({ name: name?.trim() || '', cells: cells || {} });
    await db.save();
    res.status(201).json({ success: true, row: db.rows[db.rows.length - 1] });
  } catch (err) {
    console.error('[CustomDB] POST /:id/rows', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE a row (name and/or one cell) ──────────────────────────────────────
router.put('/:id/rows/:rowId', authenticateToken, async (req, res) => {
  try {
    const { name, cells, cellKey, cellValue } = req.body;
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    const row = db.rows.id(req.params.rowId);
    if (!row) return res.status(404).json({ message: 'Row not found' });

    if (name !== undefined) row.name = name.trim();
    // Full cells replace
    if (cells !== undefined) row.cells = cells;
    // Single cell update (efficient — just one key)
    if (cellKey !== undefined) {
      const current = row.cells || {};
      current[cellKey] = cellValue ?? '';
      row.cells = { ...current };
    }
    row.updatedAt = new Date();

    await db.save();
    res.json({ success: true, row });
  } catch (err) {
    console.error('[CustomDB] PUT /:id/rows/:rowId', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE a row ─────────────────────────────────────────────────────────────
router.delete('/:id/rows/:rowId', authenticateToken, async (req, res) => {
  try {
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });
    db.rows = db.rows.filter(r => r._id.toString() !== req.params.rowId);
    await db.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[CustomDB] DELETE /:id/rows/:rowId', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── COLUMN CRUD ─────────────────────────────────────────────────────────────

// Add column
router.post('/:id/columns', authenticateToken, async (req, res) => {
  try {
    const { name, type, required, placeholder } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Column name is required' });

    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    const col = {
      name: name.trim(),
      type: type || 'text',
      order: db.columns.length,
      required: !!required,
      placeholder: placeholder?.trim() || '',
    };
    db.columns.push(col);
    await db.save();

    const newCol = db.columns[db.columns.length - 1];
    res.status(201).json({ success: true, column: newCol, columns: db.columns });
  } catch (err) {
    console.error('[CustomDB] POST /:id/columns', err);
    res.status(500).json({ message: err.message });
  }
});

// Rename / retype column
router.put('/:id/columns/:colId', authenticateToken, async (req, res) => {
  try {
    const { name, type, required, placeholder } = req.body;
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    const col = db.columns.id(req.params.colId);
    if (!col) return res.status(404).json({ message: 'Column not found' });

    if (name !== undefined) col.name = name.trim();
    if (type !== undefined) col.type = type;
    if (required !== undefined) col.required = !!required;
    if (placeholder !== undefined) col.placeholder = placeholder.trim();

    await db.save();
    res.json({ success: true, column: col, columns: db.columns });
  } catch (err) {
    console.error('[CustomDB] PUT /:id/columns/:colId', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete column (also wipes that cell from all rows)
router.delete('/:id/columns/:colId', authenticateToken, async (req, res) => {
  try {
    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    const colId = req.params.colId;
    db.columns = db.columns.filter(c => c._id.toString() !== colId);

    // Remove cells for deleted column from all rows
    db.rows.forEach(row => {
      if (row.cells && row.cells[colId] !== undefined) {
        const updated = { ...row.cells };
        delete updated[colId];
        row.cells = updated;
      }
    });

    await db.save();
    res.json({ success: true, columns: db.columns });
  } catch (err) {
    console.error('[CustomDB] DELETE /:id/columns/:colId', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── Bulk import rows ─────────────────────────────────────────────────────────
router.post('/:id/import', authenticateToken, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ message: 'rows must be a non-empty array' });

    const db = await CustomDatabase.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });

    // Auto-create columns from keys found in data
    const existingColNames = new Set(db.columns.map(c => c.name.toLowerCase()));
    const newColMap = {}; // colName → colId

    const newRows = rows.filter(r => r.name?.trim()).map(r => {
      const cells = {};
      if (r.cells || r.data) {
        const src = r.cells || r.data;
        Object.entries(src).forEach(([key, val]) => {
          // Find or create column
          let col = db.columns.find(c => c.name.toLowerCase() === key.toLowerCase());
          if (!col && !existingColNames.has(key.toLowerCase()) && !newColMap[key.toLowerCase()]) {
            db.columns.push({ name: key, type: 'text', order: db.columns.length });
            col = db.columns[db.columns.length - 1];
            existingColNames.add(key.toLowerCase());
            newColMap[key.toLowerCase()] = col;
          } else if (!col) {
            col = newColMap[key.toLowerCase()];
          }
          if (col) cells[col._id.toString()] = val;
        });
      }
      return { name: r.name.trim(), cells };
    });

    db.rows.push(...newRows);
    await db.save();

    res.json({ success: true, imported: newRows.length, total: db.rows.length, columns: db.columns });
  } catch (err) {
    console.error('[CustomDB] POST /:id/import', err);
    res.status(500).json({ message: err.message });
  }
});

// Serve icon files
router.get('/icon/:filename', (req, res) => {
  const filePath = path.join(iconDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

module.exports = router;
