const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');

describe('Task Model', () => {
  it('should create a valid task with all required fields', async () => {
    const validTask = {
      title: 'Test Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000), // Tomorrow
      createdBy: new mongoose.Types.ObjectId(),
    };

    const task = new Task(validTask);
    const savedTask = await task.save();

    expect(savedTask.title).toBe(validTask.title);
    expect(savedTask.goal).toBe(validTask.goal);
    expect(savedTask.successMetric).toBe(validTask.successMetric);
    expect(savedTask.status).toBe('pending');
    expect(savedTask.priority).toBe('medium');
    expect(savedTask.isDeleted).toBe(false);
    expect(savedTask.createdAt).toBeDefined();
    expect(savedTask.updatedAt).toBeDefined();
  });

  it('should fail validation when required fields are missing', async () => {
    const invalidTask = {
      title: 'Test Task',
      // Missing goal, successMetric, deadline, createdBy
    };

    const task = new Task(invalidTask);
    let error;

    try {
      await task.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.goal).toBeDefined();
    expect(error.errors.successMetric).toBeDefined();
    expect(error.errors.deadline).toBeDefined();
    expect(error.errors.createdBy).toBeDefined();
  });

  it('should fail validation when deadline is in the past', async () => {
    const invalidTask = {
      title: 'Test Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() - 86400000), // Yesterday
      createdBy: new mongoose.Types.ObjectId(),
    };

    const task = new Task(invalidTask);
    let error;

    try {
      await task.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.deadline).toBeDefined();
  });

  it('should enforce field length limits', async () => {
    const invalidTask = {
      title: 'A'.repeat(201), // Exceeds 200 char limit
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: new mongoose.Types.ObjectId(),
    };

    const task = new Task(invalidTask);
    let error;

    try {
      await task.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.title).toBeDefined();
  });

  it('should accept valid status and priority values', async () => {
    const validTask = {
      title: 'Test Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: new mongoose.Types.ObjectId(),
      status: 'in_progress',
      priority: 'high',
    };

    const task = new Task(validTask);
    const savedTask = await task.save();

    expect(savedTask.status).toBe('in_progress');
    expect(savedTask.priority).toBe('high');
  });

  it('should reject invalid status values', async () => {
    const invalidTask = {
      title: 'Test Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: new mongoose.Types.ObjectId(),
      status: 'invalid_status',
    };

    const task = new Task(invalidTask);
    let error;

    try {
      await task.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });

  it('should handle soft delete functionality', async () => {
    const validTask = {
      title: 'Test Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: new mongoose.Types.ObjectId(),
    };

    const task = new Task(validTask);
    const savedTask = await task.save();

    // Test soft delete
    await savedTask.softDelete();
    
    expect(savedTask.isDeleted).toBe(true);
    expect(savedTask.deletedAt).toBeDefined();
  });

  it('should find only active tasks with findActive method', async () => {
    // Create active task
    const activeTask = new Task({
      title: 'Active Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: new mongoose.Types.ObjectId(),
    });
    await activeTask.save();

    // Create deleted task
    const deletedTask = new Task({
      title: 'Deleted Task',
      goal: 'Complete the test implementation',
      successMetric: 'All tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: new mongoose.Types.ObjectId(),
      isDeleted: true,
    });
    await deletedTask.save();

    const activeTasks = await Task.findActive();
    expect(activeTasks).toHaveLength(1);
    expect(activeTasks[0].title).toBe('Active Task');
  });
}); 