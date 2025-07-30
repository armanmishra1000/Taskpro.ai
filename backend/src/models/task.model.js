const mongoose = require('mongoose');

// Blocker subdocument schema
const blockerSchema = new mongoose.Schema({
  reportedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  reportedAt: { 
    type: Date, 
    default: Date.now 
  },
  impact: { 
    type: String, 
    enum: ['critical', 'high', 'medium'], 
    required: true 
  },
  attempts: { 
    type: String, 
    required: true, 
    minlength: 20 
  },
  logs: { 
    type: String, 
    required: true, 
    minlength: 10 
  },
  status: { 
    type: String, 
    enum: ['active', 'escalated', 'resolved'], 
    default: 'active' 
  },
  managerNotified: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  resolvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  resolvedAt: { 
    type: Date 
  },
  resolution: { 
    type: String 
  }
}, { _id: false });

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
    enum: ['pending', 'ready', 'in_progress', 'review', 'done', 'blocked'],
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
  blockers: [blockerSchema],
  comments: [{ type: mongoose.Schema.Types.Mixed }],
  statusHistory: [{
    fromStatus: {
      type: String,
      enum: ['pending', 'ready', 'in_progress', 'review', 'done', 'blocked'],
      required: true
    },
    toStatus: {
      type: String, 
      enum: ['pending', 'ready', 'in_progress', 'review', 'done', 'blocked'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    reason: {
      type: String,
      maxlength: 500
    },
    duration: {
      type: Number, // Milliseconds in previous status
      min: 0
    }
  }],
  
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

// Compound indexes for card filtering performance
// (from task-prompts.md Task B1)
taskSchema.index({ status: 1, deadline: 1 });
taskSchema.index({ assignedTo: 1, deadline: 1 });
taskSchema.index({ teamId: 1, status: 1 });
taskSchema.index({ createdBy: 1, deadline: 1 });
taskSchema.index({ deadline: 1, priority: 1 });

// Blocker-specific indexes for performance
taskSchema.index({ 'blockers.status': 1 });
taskSchema.index({ 'blockers.reportedBy': 1 });
taskSchema.index({ 'blockers.managerNotified': 1 });

// Pre-save middleware to handle soft delete
taskSchema.pre('save', function(next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Enhanced pre-save middleware for status change timestamps
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    // Update timestamps based on status
    if (this.status === 'in_progress' && !this.startedAt) {
      this.startedAt = new Date();
    }
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    }
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

// Instance methods for card display
// Urgency level: overdue, today, tomorrow, week, future
taskSchema.methods.getUrgencyLevel = function() {
  const now = new Date();
  const due = new Date(this.deadline);
  if (due < now) return 'overdue';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  if (due >= today && due < tomorrow) return 'today';
  if (due >= tomorrow && due < new Date(tomorrow.getTime() + 24*60*60*1000)) return 'tomorrow';
  if (due < nextWeek) return 'week';
  return 'future';
};

taskSchema.methods.getTimeAgo = function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

// Static methods for filtering and summaries
taskSchema.statics.getTasksByDeadline = function(userId, urgencyLevel) {
  const baseQuery = { $or: [{ createdBy: userId }, { assignedTo: userId }] };
  const now = new Date();
  switch (urgencyLevel) {
    case 'overdue':
      return this.find({ ...baseQuery, deadline: { $lt: now }, status: { $ne: 'done' } });
    case 'today': {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      return this.find({ ...baseQuery, deadline: { $gte: startOfDay, $lte: endOfDay } });
    }
    case 'tomorrow': {
      const startOfTomorrow = new Date();
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      startOfTomorrow.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(startOfTomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      return this.find({ ...baseQuery, deadline: { $gte: startOfTomorrow, $lte: endOfTomorrow } });
    }
    case 'week': {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return this.find({ ...baseQuery, deadline: { $gte: now, $lte: nextWeek } });
    }
    case 'assigned':
      return this.find({ assignedTo: userId });
    default:
      return this.find(baseQuery);
  }
};

taskSchema.statics.getTaskSummary = async function(userId) {
  const baseQuery = { $or: [{ createdBy: userId }, { assignedTo: userId }] };
  const now = new Date();
  const [overdue, today, tomorrow, week, total] = await Promise.all([
    this.countDocuments({ ...baseQuery, deadline: { $lt: now }, status: { $ne: 'done' } }),
    this.countDocuments({ 
      ...baseQuery, 
      deadline: { 
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      } 
    }),
    this.countDocuments({
      ...baseQuery,
      deadline: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)
      }
    }),
    this.countDocuments({
      ...baseQuery,
      deadline: {
        $gte: now,
        $lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }),
    this.countDocuments(baseQuery)
  ]);
  return { overdue, today, tomorrow, week, total };
};

// Status transition validation
taskSchema.statics.isValidStatusTransition = function(fromStatus, toStatus) {
  const validTransitions = {
    'pending': ['ready'],
    'ready': ['in_progress', 'blocked'],
    'in_progress': ['review', 'blocked'],
    'review': ['done', 'in_progress'],
    'blocked': ['ready', 'in_progress'],
    'done': [] // Terminal status
  };
  return validTransitions[fromStatus]?.includes(toStatus) || false;
};

module.exports = mongoose.model('Task', taskSchema); 