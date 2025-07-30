const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Core user fields from UserContract
  telegramId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String,
    trim: true
  },
  username: { 
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['member', 'manager', 'admin'],
    default: 'member'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  settings: {
    timezone: { 
      type: String, 
      default: 'UTC' 
    },
    notifications: { 
      type: Boolean, 
      default: true 
    }
  },
  
  // Base model fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Add indexes for performance
userSchema.index({ telegramId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ isActive: 1, isDeleted: 1 });

// Pre-save middleware to handle soft delete
userSchema.pre('save', function(next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true, isDeleted: false });
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true, isDeleted: false });
};

// Instance method to soft delete
userSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

// Ensure virtuals are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema); 