// Task model contract
module.exports = {
  TaskContract: {
    // Extends BaseModelContract
    title: 'String',           // NOT name, NOT taskName
    description: 'String',     // NOT desc, NOT details
    goal: 'String',           // NOT objective, NOT aim
    successMetric: 'String',   // NOT metric, NOT success_metric
    deadline: 'Date',         // NOT due_date, NOT dueDate
    
    // References
    createdBy: 'ObjectId',    // NOT creator, NOT created_by
    assignedTo: 'ObjectId',   // NOT assignee, NOT assigned_to
    teamId: 'ObjectId',       // NOT team_id, NOT group
    
    // Status
    status: 'String',         // 'pending'|'ready'|'in_progress'|'review'|'done'
    priority: 'String',       // 'low'|'medium'|'high'|'critical'
    
    // Tracking
    startedAt: 'Date',        // NOT started_at
    completedAt: 'Date',      // NOT completed_at
    
    // Arrays
    blockers: 'Array',        // Array of blocker objects
    comments: 'Array',        // Array of comment objects
    statusHistory: 'Array'    // Array of status changes
  }
}; 