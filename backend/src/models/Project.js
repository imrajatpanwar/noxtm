const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [1, 'Title must be at least 1 character long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [1, 'Description must be at least 1 character long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  }
}, {
  timestamps: true
});

// Create indexes
projectSchema.index({ creator: 1, createdAt: -1 });
projectSchema.index({ isPublic: 1, createdAt: -1 });
projectSchema.index({ tags: 1 });

module.exports = mongoose.model('Project', projectSchema);
