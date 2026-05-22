const mongoose = require('mongoose');

const CoreDataSchema = new mongoose.Schema({
  source: { type: String, required: true },        // e.g. "orion", "manual"
  dataType: { type: String, required: true },       // e.g. "leads", "contacts", "custom"
  label: { type: String },                          // human-readable name
  data: { type: mongoose.Schema.Types.Mixed, required: true }, // any payload
  meta: { type: mongoose.Schema.Types.Mixed },      // extra metadata
  count: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CoreDataSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (Array.isArray(this.data)) this.count = this.data.length;
  next();
});

module.exports = mongoose.model('CoreData', CoreDataSchema);
