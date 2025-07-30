const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Core task fields from TaskContract
  title: { 
    type: String, 
    required: true, 
    maxlength: 200,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 1000,
    trim: true
  },
  goal: { 
    type: String, 
    required: true, 
    maxlength: 500,
    trim: true
  },
  successMetric: { 
    type: String, 
    required: true, 
    maxlength: 300,
    trim: true
  },
  deadline: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Deadline must be a future date'
    }
  },
  
  // References
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team' 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'ready', 'in_progress', 'review', 'done'],
    default: 'pending'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Tracking
  startedAt: Date,
  completedAt: Date,
  
  // Arrays
  blockers: [{ type: mongoose.Schema.Types.Mixed }],
  comments: [{ type: mongoose.Schema.Types.Mixed }],
  statusHistory: [{ type: mongoose.Schema.Types.Mixed }],
  
  // Soft delete fields from BaseModelContract
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Add indexes for performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ teamId: 1 });
taskSchema.index({ isDeleted: 1 });

// Additional indexes for task assignment queries
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1, assignedTo: 1 });
taskSchema.index({ teamId: 1, status: 1 });
taskSchema.index({ teamId: 1, assignedTo: 1 });

// Pre-save middleware to handle soft delete
taskSchema.pre('save', function(next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Static method to find non-deleted tasks
taskSchema.statics.findActive = function() {
  return this.find({ isDeleted: false });
};

// Instance method to soft delete
taskSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema); 