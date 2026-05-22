const mongoose = require('mongoose');

const salesPipelineSchema = new mongoose.Schema({
  // Core lead info (denormalized for speed)
  name:    { type: String },
  email:   { type: String },
  phone:   { type: String },
  company: { type: String },
  location:{ type: String },
  headline:{ type: String },

  // Full original lead data blob
  fullData: { type: mongoose.Schema.Types.Mixed },

  // Source tracking
  sourceEntryId: { type: String },          // CoreData entry _id
  sourceEntryLabel: { type: String },       // CoreData entry label
  source: { type: String, default: 'core-data' },

  // Sales fields
  status: {
    type: String,
    enum: ['new', 'contacted', 'followup', 'converted', 'lost'],
    default: 'new',
  },
  remark:    { type: String, default: '' },
  followUpAt:{ type: Date },

  // Who shared this lead into pipeline
  sharedBy: {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:     { type: String },
    avatar:   { type: String },
    email:    { type: String },
  },

  // Who is working on this lead
  assignedTo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:   { type: String },
    avatar: { type: String },
    email:  { type: String },
  },

  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true });

salesPipelineSchema.index({ companyId: 1, status: 1 });
salesPipelineSchema.index({ 'assignedTo.userId': 1 });

module.exports = mongoose.model('SalesPipeline', salesPipelineSchema);
