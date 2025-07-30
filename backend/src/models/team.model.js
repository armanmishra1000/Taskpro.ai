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
  standupConfig: {
    enabled: { type: Boolean, default: false },
    scheduleTime: { 
      type: String, 
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    timezone: { type: String, default: 'UTC' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    channelId: { type: String },
    reminderEnabled: { type: Boolean, default: true },
    lastRun: { type: Date },
    responseTimeout: { type: Number, default: 120 } // minutes
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

// Dashboard-specific indexes for manager queries
teamSchema.index({ 'members.role': 1, isDeleted: 1 });
teamSchema.index({ createdBy: 1, isDeleted: 1 });

// Update timestamp middleware
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Dashboard-specific static methods for manager queries
teamSchema.statics.getTeamsForManager = function(userId) {
  return this.find({
    $or: [
      { createdBy: userId },
      { 'members.userId': userId, 'members.role': { $in: ['manager', 'admin'] } }
    ],
    isDeleted: false
  }).populate('members.userId', 'firstName lastName username role');
};

teamSchema.statics.getTeamMembers = function(teamId) {
  return this.findById(teamId)
    .populate('members.userId', 'firstName lastName username role isActive')
    .select('members');
};

teamSchema.statics.getManagerTeams = function(userId) {
  return this.find({
    $or: [
      { createdBy: userId },
      { 'members.userId': userId, 'members.role': { $in: ['manager', 'admin'] } }
    ],
    isDeleted: false
  }).select('_id name description members');
};

// Instance method to check if user is manager/admin
teamSchema.methods.isUserManager = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && ['manager', 'admin'].includes(member.role);
};

// Instance method to get active member count
teamSchema.methods.getActiveMemberCount = function() {
  return this.members.filter(member => member.role !== 'inactive').length;
};

module.exports = mongoose.model('Team', teamSchema); 