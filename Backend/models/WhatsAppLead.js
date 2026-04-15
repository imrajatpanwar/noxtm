const mongoose = require('mongoose');

const whatsappLeadSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  phone: { type: String, required: true }, // cleaned digits only e.g. "919876543210"
  name: { type: String, default: '' },
  whatsappId: { type: String }, // JID e.g. "919876543210@s.whatsapp.net"
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppContact' },
  status: {
    type: String,
    enum: ['new', 'active', 'dead', 'followup', 'converted'],
    default: 'new'
  },
  campaigns: [{
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppCampaign' },
    campaignName: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false }
  }],
  lastCampaignAt: { type: Date },
  lastCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppCampaign' },
  repliedAt: { type: Date },
  notes: { type: String, default: '' }
}, { timestamps: true });

whatsappLeadSchema.index({ companyId: 1, phone: 1 }, { unique: true });
whatsappLeadSchema.index({ companyId: 1, status: 1 });
whatsappLeadSchema.index({ companyId: 1, 'campaigns.campaignId': 1 });

module.exports = mongoose.model('WhatsAppLead', whatsappLeadSchema);
