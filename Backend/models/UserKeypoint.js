const mongoose = require('mongoose');

/**
 * UserKeypoint — stores auto-extracted keypoints from user conversations.
 * Max 50 keypoints per user (rolling window: oldest removed when 51st added).
 * Used by the bot to personalize responses and shown to admin in dashboard.
 */
const userKeypointSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  content: { type: String, required: true, maxlength: 300 }, // The keypoint text
  category: {
    type: String,
    enum: ['interest', 'preference', 'personal', 'work', 'opinion', 'request', 'behavior', 'other'],
    default: 'other'
  },
  source: { type: String, default: 'auto' }, // 'auto' = extracted by AI, 'manual' = added by admin
  createdAt: { type: Date, default: Date.now }
});

userKeypointSchema.index({ userId: 1, createdAt: 1 });

const UserKeypoint = mongoose.model('UserKeypoint', userKeypointSchema);

module.exports = UserKeypoint;
