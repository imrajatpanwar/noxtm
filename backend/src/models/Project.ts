import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  title: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  creator: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
projectSchema.index({ creator: 1 });
projectSchema.index({ isPublic: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
