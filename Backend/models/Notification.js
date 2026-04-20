const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  type:      { type: String, required: true },
  title:     { type: String, required: true },
  message:   { type: String, default: '' },
  icon:      { type: String, default: 'info' },
  link:      { type: String, default: '' }, // section key to navigate to
  read:      { type: Boolean, default: false, index: true },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
