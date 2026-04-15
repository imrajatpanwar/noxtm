const mongoose = require('mongoose');
const crypto = require('crypto');

const sharedCalendarLinkSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  token: { type: String, unique: true, default: () => crypto.randomBytes(24).toString('hex') },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SharedCalendarLink', sharedCalendarLinkSchema);
