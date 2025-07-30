const taskCreationService = require('../../src/services/task-creation/task-creation.service');
const Task = require('../../src/models/task.model');
const { ValidationError } = require('../../src/utils/errors');
const mongoose = require('mongoose');

// Mock Task model
jest.mock('../../src/models/task.model');

describe('TaskCreationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseTaskDescription', () => {
    it('should parse task description with all fields', async () => {
      const description = 'Fix login error on mobile app by tomorrow';
      const userId = new mongoose.Types.ObjectId();

      const result = await taskCreationService.parseTaskDescription(description, userId);

      expect(result).toEqual({
        title: 'Fix login error on mobile app by tomorrow',
        goal: 'Fix login error on mobile app by tomorrow',
        successMetric: 'Issue is resolved and working properly',
        deadline: expect.any(Date),
        description: 'Fix login error on mobile app by tomorrow'
      });

      // Check deadline is tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      expect(result.deadline.getDate()).toBe(tomorrow.getDate());
    });

    it('should handle description without deadline', async () => {
      const description = 'Create new user dashboard';
      const userId = new mongoose.Types.ObjectId();

      const result = await taskCreationService.parseTaskDescription(description, userId);

      expect(result).toEqual({
        title: 'Create new user dashboard',
        goal: 'Create new user dashboard',
        successMetric: 'Feature is implemented and functional',
        deadline: null,
        description: 'Create new user dashboard'
      });
    });

    it('should handle long descriptions', async () => {
      const longDescription = 'This is a very long task description that should be truncated for the title. It contains many words and should be cut off at 50 characters.';
      const userId = new mongoose.Types.ObjectId();

      const result = await taskCreationService.parseTaskDescription(longDescription, userId);

      expect(result.title).toBe('This is a very long task description that should b...');
      expect(result.description).toBe(longDescription);
    });
  });

  describe('extractTitle', () => {
    it('should extract first sentence as title', () => {
      const text = 'Fix the bug. Then test it.';
      const title = taskCreationService.extractTitle(text);
      expect(title).toBe('Fix the bug');
    });

    it('should truncate long titles', () => {
      const longText = 'This is a very long sentence that should be truncated at 50 characters for the title.';
      const title = taskCreationService.extractTitle(longText);
      expect(title).toBe('This is a very long sentence that should be trunca...');
    });
  });

  describe('extractGoal', () => {
    it('should extract goal with fix keyword', () => {
      const text = 'Fix the login issue';
      const goal = taskCreationService.extractGoal(text);
      expect(goal).toBe('Fix the login issue');
    });

    it('should extract goal with create keyword', () => {
      const text = 'Create new feature';
      const goal = taskCreationService.extractGoal(text);
      expect(goal).toBe('Create new feature');
    });

    it('should return empty string for text without goal keywords', () => {
      const text = 'Just some random text';
      const goal = taskCreationService.extractGoal(text);
      expect(goal).toBe('');
    });
  });

  describe('extractSuccessMetric', () => {
    it('should extract success metric with works keyword', () => {
      const text = 'Make sure it works';
      const metric = taskCreationService.extractSuccessMetric(text);
      expect(metric).toBe('Task is works');
    });

    it('should create generic metric for fix tasks', () => {
      const text = 'Fix the bug';
      const metric = taskCreationService.extractSuccessMetric(text);
      expect(metric).toBe('Issue is resolved and working properly');
    });

    it('should create generic metric for create tasks', () => {
      const text = 'Create new feature';
      const metric = taskCreationService.extractSuccessMetric(text);
      expect(metric).toBe('Feature is implemented and functional');
    });
  });

  describe('extractDeadline', () => {
    it('should extract today deadline', () => {
      const text = 'Do this today';
      const deadline = taskCreationService.extractDeadline(text);
      expect(deadline.getDate()).toBe(new Date().getDate());
      expect(deadline.getHours()).toBe(23);
      expect(deadline.getMinutes()).toBe(59);
    });

    it('should extract tomorrow deadline', () => {
      const text = 'Do this tomorrow';
      const deadline = taskCreationService.extractDeadline(text);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(deadline.getDate()).toBe(tomorrow.getDate());
    });

    it('should extract week deadline', () => {
      const text = 'Do this next week';
      const deadline = taskCreationService.extractDeadline(text);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      expect(deadline.getDate()).toBe(nextWeek.getDate());
    });

    it('should extract "in X days" deadline', () => {
      const text = 'Do this in 3 days';
      const deadline = taskCreationService.extractDeadline(text);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      expect(deadline.getDate()).toBe(futureDate.getDate());
    });

    it('should extract "next Monday" deadline', () => {
      const text = 'Do this next Monday';
      const deadline = taskCreationService.extractDeadline(text);
      expect(deadline.getDay()).toBe(1); // Monday
    });

    it('should return null for text without deadline', () => {
      const text = 'Just do this';
      const deadline = taskCreationService.extractDeadline(text);
      expect(deadline).toBeNull();
    });
  });

  describe('validateTaskData', () => {
    it('should validate correct task data', () => {
      const validData = {
        title: 'Test Task',
        goal: 'This is a clear and specific goal that meets the minimum length requirement',
        successMetric: 'Task is completed successfully',
        deadline: new Date(Date.now() + 86400000) // Tomorrow
      };

      expect(() => taskCreationService.validateTaskData(validData)).not.toThrow();
    });

    it('should throw error for missing goal', () => {
      const invalidData = {
        title: 'Test Task',
        goal: '',
        successMetric: 'Task is completed',
        deadline: new Date(Date.now() + 86400000)
      };

      expect(() => taskCreationService.validateTaskData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for short goal', () => {
      const invalidData = {
        title: 'Test Task',
        goal: 'Short',
        successMetric: 'Task is completed',
        deadline: new Date(Date.now() + 86400000)
      };

      expect(() => taskCreationService.validateTaskData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for missing success metric', () => {
      const invalidData = {
        title: 'Test Task',
        goal: 'This is a clear and specific goal',
        successMetric: '',
        deadline: new Date(Date.now() + 86400000)
      };

      expect(() => taskCreationService.validateTaskData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for missing deadline', () => {
      const invalidData = {
        title: 'Test Task',
        goal: 'This is a clear and specific goal',
        successMetric: 'Task is completed',
        deadline: null
      };

      expect(() => taskCreationService.validateTaskData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for past deadline', () => {
      const invalidData = {
        title: 'Test Task',
        goal: 'This is a clear and specific goal',
        successMetric: 'Task is completed',
        deadline: new Date(Date.now() - 86400000) // Yesterday
      };

      expect(() => taskCreationService.validateTaskData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for missing title', () => {
      const invalidData = {
        title: '',
        goal: 'This is a clear and specific goal',
        successMetric: 'Task is completed',
        deadline: new Date(Date.now() + 86400000)
      };

      expect(() => taskCreationService.validateTaskData(invalidData)).toThrow(ValidationError);
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        goal: 'This is a clear and specific goal',
        successMetric: 'Task is completed',
        deadline: new Date(Date.now() + 86400000),
        createdBy: new mongoose.Types.ObjectId(),
        priority: 'high'
      };

      const mockTask = {
        save: jest.fn().mockResolvedValue({ _id: 'task123', ...taskData })
      };

      Task.mockImplementation(() => mockTask);

      const result = await taskCreationService.createTask(taskData);

      expect(Task).toHaveBeenCalledWith({
        title: taskData.title,
        description: taskData.description,
        goal: taskData.goal,
        successMetric: taskData.successMetric,
        deadline: taskData.deadline,
        createdBy: taskData.createdBy,
        status: 'pending',
        priority: 'high'
      });

      expect(mockTask.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'task123', ...taskData });
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = {
        title: 'Test',
        goal: 'Short',
        successMetric: 'Done',
        deadline: new Date(Date.now() - 86400000) // Past date
      };

      await expect(taskCreationService.createTask(invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('getTaskById', () => {
    it('should return task if found', async () => {
      const mockTask = { _id: 'task123', title: 'Test Task' };
      Task.findById.mockResolvedValue(mockTask);

      const result = await taskCreationService.getTaskById('task123');

      expect(Task.findById).toHaveBeenCalledWith('task123');
      expect(result).toEqual(mockTask);
    });

    it('should throw error if task not found', async () => {
      Task.findById.mockResolvedValue(null);

      await expect(taskCreationService.getTaskById('nonexistent')).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const mockTask = {
        _id: 'task123',
        title: 'Old Title',
        goal: 'Old goal',
        toObject: jest.fn().mockReturnValue({
          _id: 'task123',
          title: 'Old Title',
          goal: 'Old goal',
          successMetric: 'Old metric',
          deadline: new Date(Date.now() + 86400000)
        }),
        save: jest.fn().mockResolvedValue({ _id: 'task123', title: 'New Title' })
      };

      Task.findById.mockResolvedValue(mockTask);

      const updates = { title: 'New Title' };
      const result = await taskCreationService.updateTask('task123', updates);

      expect(mockTask.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'task123', title: 'New Title' });
    });

    it('should validate updates when required fields are modified', async () => {
      const mockTask = {
        _id: 'task123',
        title: 'Old Title',
        goal: 'Old goal',
        toObject: jest.fn().mockReturnValue({
          _id: 'task123',
          title: 'Old Title',
          goal: 'Old goal',
          successMetric: 'Old metric',
          deadline: new Date(Date.now() + 86400000)
        }),
        save: jest.fn().mockResolvedValue({ _id: 'task123' })
      };

      Task.findById.mockResolvedValue(mockTask);

      const updates = { goal: 'This is a clear and specific goal that meets requirements' };
      await taskCreationService.updateTask('task123', updates);

      expect(mockTask.save).toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should soft delete task successfully', async () => {
      const mockTask = {
        _id: 'task123',
        softDelete: jest.fn().mockResolvedValue({ _id: 'task123', isDeleted: true })
      };

      Task.findById.mockResolvedValue(mockTask);

      const result = await taskCreationService.deleteTask('task123');

      expect(mockTask.softDelete).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'task123', isDeleted: true });
    });

    it('should throw error if task not found', async () => {
      Task.findById.mockResolvedValue(null);

      await expect(taskCreationService.deleteTask('nonexistent')).rejects.toThrow(ValidationError);
    });
  });
}); 