const mongoose = require('mongoose');

const standupResponseSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }, // Standup date (midnight UTC)
  responses: {
    yesterday: { type: String, required: true, maxlength: 500 },
    today: { type: String, required: true, maxlength: 500 },
    blockers: { type: String, required: true, maxlength: 500 }
  },
  submittedAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'late', 'missed'],
    default: 'pending'
  }
});

// Indexes for efficient queries
standupResponseSchema.index({ teamId: 1, date: 1 });
standupResponseSchema.index({ userId: 1, date: 1 });
standupResponseSchema.index({ teamId: 1, userId: 1, date: 1 }, { unique: true });

// Update editedAt timestamp when document is modified
standupResponseSchema.pre('save', function(next) {
  if (this.isModified('responses')) {
    this.editedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('StandupResponse', standupResponseSchema); 