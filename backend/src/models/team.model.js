const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['member', 'manager', 'admin'], 
    default: 'member' 
  },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  addedAt: { type: Date, default: Date.now }
});

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    maxlength: 100,
    trim: true 
  },
  description: { 
    type: String, 
    maxlength: 500,
    trim: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  members: [memberSchema],
  settings: {
    allowMemberInvite: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false }
  },
  
  // Base model fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});

// Indexes for performance
teamSchema.index({ createdBy: 1 });
teamSchema.index({ 'members.userId': 1 });
teamSchema.index({ isDeleted: 1 });

// Update timestamp middleware
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Team', teamSchema); 