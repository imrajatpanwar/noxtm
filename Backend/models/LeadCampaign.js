const mongoose = require('mongoose');

const leadCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  method: {
    type: String,
    required: true,
    enum: ['manual', 'csv', 'extension', 'third-party']
  },
  dataType: {
    type: String,
    enum: ['lead-mining', 'exhibitor-list', 'exhibitor-data'],
    default: 'lead-mining'
  },
  leadType: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{ type: String, trim: true }],
  sourceNotes: { type: String, trim: true },
  expectedLeadCount: { type: Number, default: 0 },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  assignees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' }
  }],
  leads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LeadDirectory' }],
  stats: {
    total: { type: Number, default: 0 },
    coldLead: { type: Number, default: 0 },
    warmLead: { type: Number, default: 0 },
    qualified: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    deadLead: { type: Number, default: 0 },
    converted: { type: Number, default: 0 }
  },
  thirdPartyConfig: {
    provider: { type: String },
    syncFrequency: { type: String, enum: ['one-time', 'daily', 'weekly', 'monthly'] },
    lastSyncAt: { type: Date },
    connectionStatus: { type: String, enum: ['connected', 'disconnected', 'error'] }
  },
  csvFileName: { type: String },
  tradeShow: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeShow', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

leadCampaignSchema.index({ userId: 1, status: 1 });
leadCampaignSchema.index({ userId: 1, createdAt: -1 });
leadCampaignSchema.index({ userId: 1, method: 1 });

// Recalculate stats from leads array
leadCampaignSchema.methods.recalculateStats = async function() {
  const Lead = mongoose.model('LeadDirectory');
  const leads = await Lead.find({ _id: { $in: this.leads } });
  this.stats = {
    total: leads.length,
    coldLead: leads.filter(l => l.status === 'Cold Lead').length,
    warmLead: leads.filter(l => l.status === 'Warm Lead').length,
    qualified: leads.filter(l => l.status === 'Qualified (SQL)').length,
    active: leads.filter(l => l.status === 'Active').length,
    deadLead: leads.filter(l => l.status === 'Dead Lead').length,
    converted: leads.filter(l => l.convertedToClient).length
  };
  return this.save();
};

module.exports = mongoose.model('LeadCampaign', leadCampaignSchema);
