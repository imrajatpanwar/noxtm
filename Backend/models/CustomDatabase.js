const mongoose = require('mongoose');

// ── Column definition ─────────────────────────────────────────────────────────
const columnSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['text','textarea','number','email','phone','url','date','boolean'], default: 'text' },
  order: { type: Number, default: 0 },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now },
});

// ── Row ───────────────────────────────────────────────────────────────────────
// `cells` is a map of { [columnId]: value }
const rowSchema = new mongoose.Schema({
  name: { type: String, default: '', trim: true }, // optional — like Excel row
  cells: { type: mongoose.Schema.Types.Mixed, default: {} }, // { [colId]: value }
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

rowSchema.pre('save', function (next) { this.updatedAt = Date.now(); next(); });

// ── Database ─────────────────────────────────────────────────────────────────
const customDatabaseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxLength: 60, trim: true },
  icon: { type: String, default: null },
  accessUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  columns: [columnSchema],  // ordered list of user-defined columns
  rows: [rowSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

customDatabaseSchema.pre('save', function (next) { this.updatedAt = Date.now(); next(); });
customDatabaseSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('CustomDatabase', customDatabaseSchema);
