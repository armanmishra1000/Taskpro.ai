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

// Dashboard-specific indexes for team activity metrics
standupResponseSchema.index({ teamId: 1, status: 1, date: 1 });
standupResponseSchema.index({ teamId: 1, submittedAt: 1 });

// Update editedAt timestamp when document is modified
standupResponseSchema.pre('save', function(next) {
  if (this.isModified('responses')) {
    this.editedAt = Date.now();
  }
  next();
});

// Dashboard-specific static methods for team activity metrics
standupResponseSchema.statics.getTeamActivityMetrics = async function(teamId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        teamId,
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalResponses: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

standupResponseSchema.statics.getTeamParticipationRate = async function(teamId, date) {
  const [responses, totalMembers] = await Promise.all([
    this.countDocuments({ teamId, date, status: 'submitted' }),
    this.countDocuments({ teamId, date })
  ]);
  
  return {
    submitted: responses,
    total: totalMembers,
    participationRate: totalMembers > 0 ? (responses / totalMembers * 100).toFixed(1) : 0
  };
};

standupResponseSchema.statics.getRecentTeamActivity = function(teamId, limit = 10) {
  return this.find({ teamId })
    .populate('userId', 'firstName lastName username')
    .sort({ submittedAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('StandupResponse', standupResponseSchema); 