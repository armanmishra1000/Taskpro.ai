const Task = require('../../models/task.model');
const { ValidationError } = require('../../utils/errors');

class TaskCreationService {
  async parseTaskDescription(description, userId) {
    // Simple AI parsing (can be enhanced with actual AI later)
    const parsed = {
      title: this.extractTitle(description),
      goal: this.extractGoal(description),
      successMetric: this.extractSuccessMetric(description),
      deadline: this.extractDeadline(description),
      description: description.trim()
    };
    
    return parsed;
  }
  
  extractTitle(text) {
    // Extract first sentence or first 50 chars as title
    const firstSentence = text.split('.')[0];
    return firstSentence.length > 50 ? 
      firstSentence.substring(0, 50) + '...' : 
      firstSentence;
  }
  
  extractGoal(text) {
    // Look for goal indicators
    const goalKeywords = ['fix', 'create', 'implement', 'solve', 'build', 'develop', 'design', 'update', 'improve'];
    for (const keyword of goalKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        return text; // Return full text as goal for now
      }
    }
    return '';
  }
  
  extractSuccessMetric(text) {
    // Look for success indicators
    const successKeywords = ['works', 'completed', 'error-free', 'successful', 'functional', 'working', 'resolved'];
    for (const keyword of successKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        return `Task is ${keyword}`;
      }
    }
    
    // If no success keywords found, create a generic metric
    if (text.toLowerCase().includes('fix')) {
      return 'Issue is resolved and working properly';
    }
    if (text.toLowerCase().includes('create') || text.toLowerCase().includes('build')) {
      return 'Feature is implemented and functional';
    }
    if (text.toLowerCase().includes('update') || text.toLowerCase().includes('improve')) {
      return 'Improvement is completed and tested';
    }
    
    return '';
  }
  
  extractDeadline(text) {
    // Simple deadline parsing
    const today = new Date();
    
    if (text.toLowerCase().includes('today')) {
      today.setHours(23, 59, 59, 999);
      return today;
    }
    
    if (text.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow;
    }
    
    if (text.toLowerCase().includes('week') || text.toLowerCase().includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      return nextWeek;
    }
    
    // Parse "in X days" format
    const inDaysMatch = text.toLowerCase().match(/in (\d+) days?/);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1]);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      futureDate.setHours(23, 59, 59, 999);
      return futureDate;
    }
    
    // Parse "next Monday/Tuesday/etc" format
    const nextDayMatch = text.toLowerCase().match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (nextDayMatch) {
      const dayName = nextDayMatch[1];
      const dayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      const targetDay = dayMap[dayName];
      const currentDay = today.getDay();
      const daysToAdd = (targetDay - currentDay + 7) % 7;
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + daysToAdd);
      nextDay.setHours(23, 59, 59, 999);
      return nextDay;
    }
    
    return null;
  }
  
  validateTaskData(data) {
    const errors = [];
    
    // Apply Elon Musk principles
    if (!data.goal || data.goal.length < 10) {
      errors.push('Goal must be clear and specific (minimum 10 characters)');
    }
    
    if (!data.successMetric || data.successMetric.length < 5) {
      errors.push('Success metric must be measurable');
    }
    
    if (!data.deadline) {
      errors.push('Deadline is required');
    } else if (new Date(data.deadline) <= new Date()) {
      errors.push('Deadline must be in the future');
    }
    
    if (!data.title || data.title.length < 3) {
      errors.push('Title must be descriptive');
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors.join('. '));
    }
    
    return true;
  }
  
  async createTask(taskData) {
    // Validate before creating
    this.validateTaskData(taskData);
    
    // Create task with exact contract fields
    const task = new Task({
      title: taskData.title,
      description: taskData.description,
      goal: taskData.goal,
      successMetric: taskData.successMetric,
      deadline: taskData.deadline,
      createdBy: taskData.createdBy,
      status: 'pending',
      priority: taskData.priority || 'medium'
    });
    
    return await task.save();
  }
  
  async getTaskById(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ValidationError('Task not found');
    }
    return task;
  }
  
  async updateTask(taskId, updates) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ValidationError('Task not found');
    }
    
    // Validate updates if they include required fields
    if (updates.goal || updates.successMetric || updates.deadline) {
      const updatedData = { ...task.toObject(), ...updates };
      this.validateTaskData(updatedData);
    }
    
    Object.assign(task, updates);
    return await task.save();
  }
  
  async deleteTask(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ValidationError('Task not found');
    }
    
    return await task.softDelete();
  }
}

module.exports = new TaskCreationService(); 