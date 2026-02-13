const mongoose = require('mongoose');

const installedModuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  moduleId: {
    type: String,
    required: true,
    enum: ['BotGit', 'ExhibitOS', 'ChatAutomation', 'WhatsAppMarketing'], // Available modules
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  installedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure a user can't install the same module twice
installedModuleSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

const InstalledModule = mongoose.model('InstalledModule', installedModuleSchema);

module.exports = InstalledModule;
