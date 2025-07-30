const mongoose = require('mongoose');
const TaskAssignmentService = require('../../src/services/task-assignment/task-assignment.service');
const Task = require('../../src/models/task.model');
const Team = require('../../src/models/team.model');
const User = require('../../src/models/user.model');
const { ValidationError } = require('../../src/utils/errors');

describe('TaskAssignmentService', () => {
  let testTask, testTeam, testUser, testAssignee;
  
  beforeEach(async () => {
    // Setup test data
    await Task.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
    
    testUser = await User.create({
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'admin'
    });
    
    testAssignee = await User.create({
      telegramId: '987654321',
      firstName: 'Test',
      lastName: 'Assignee',
      username: 'testassignee',
      role: 'member'
    });
    
    testTeam = await Team.create({
      name: 'Test Team',
      createdBy: testUser._id,
      members: [
        { userId: testUser._id, username: 'testuser', role: 'admin', addedBy: testUser._id },
        { userId: testAssignee._id, username: 'testassignee', role: 'member', addedBy: testUser._id }
      ]
    });
    
    // Create test task with future deadline
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
    
    testTask = await Task.create({
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      successMetric: 'Test metric',
      deadline: futureDate,
      createdBy: testUser._id,
      teamId: testTeam._id,
      status: 'pending'
    });
  });
  
  describe('getUnassignedTasks', () => {
    test('returns unassigned tasks for user', async () => {
      const tasks = await TaskAssignmentService.getUnassignedTasks(testUser._id.toString());
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0]._id.toString()).toBe(testTask._id.toString());
      expect(tasks[0].assignedTo).toBeUndefined();
    });
    
    test('excludes assigned tasks', async () => {
      testTask.assignedTo = testAssignee._id;
      await testTask.save();
      
      const tasks = await TaskAssignmentService.getUnassignedTasks(testUser._id.toString());
      
      expect(tasks).toHaveLength(0);
    });
    
    test('excludes completed tasks', async () => {
      testTask.status = 'done';
      await testTask.save();
      
      const tasks = await TaskAssignmentService.getUnassignedTasks(testUser._id.toString());
      
      expect(tasks).toHaveLength(0);
    });
    
    test('includes ready status tasks', async () => {
      testTask.status = 'ready';
      await testTask.save();
      
      const tasks = await TaskAssignmentService.getUnassignedTasks(testUser._id.toString());
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('ready');
    });
    
    test('filters by team when teamId provided', async () => {
      // Create task without team
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const noTeamTask = await Task.create({
        title: 'No Team Task',
        description: 'Task without team',
        goal: 'Test goal',
        successMetric: 'Test metric',
        deadline: futureDate,
        createdBy: testUser._id,
        status: 'pending'
      });
      
      const tasks = await TaskAssignmentService.getUnassignedTasks(testUser._id.toString(), testTeam._id.toString());
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0]._id.toString()).toBe(testTask._id.toString());
    });
  });
  
  describe('getAssignableMembers', () => {
    test('returns all active team members', async () => {
      const members = await TaskAssignmentService.getAssignableMembers(testTeam._id.toString());
      
      expect(members).toHaveLength(2);
      expect(members.some(m => m.username === 'testuser')).toBe(true);
      expect(members.some(m => m.username === 'testassignee')).toBe(true);
    });
    
    test('returns all team members', async () => {
      const members = await TaskAssignmentService.getAssignableMembers(testTeam._id.toString());
      
      expect(members).toHaveLength(2);
      expect(members.some(m => m.username === 'testuser')).toBe(true);
      expect(members.some(m => m.username === 'testassignee')).toBe(true);
    });
    
    test('excludes specific user when excludeUserId provided', async () => {
      const members = await TaskAssignmentService.getAssignableMembers(
        testTeam._id.toString(), 
        testUser._id.toString()
      );
      
      expect(members).toHaveLength(1);
      expect(members[0].username).toBe('testassignee');
    });
    
    test('throws error for non-existent team', async () => {
      const fakeTeamId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskAssignmentService.getAssignableMembers(fakeTeamId.toString())
      ).rejects.toThrow('Team not found');
    });
  });
  
  describe('assignTask', () => {
    test('successfully assigns task to team member', async () => {
      const result = await TaskAssignmentService.assignTask(
        testTask._id.toString(),
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(result.assignedTo.toString()).toBe(testAssignee._id.toString());
      expect(result.status).toBe('ready'); // Should change from pending to ready
    });
    
    test('throws error for non-existent task', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskAssignmentService.assignTask(
          fakeTaskId.toString(),
          testAssignee._id.toString(), 
          testUser._id.toString()
        )
      ).rejects.toThrow('Task not found');
    });
    
    test('throws error for already assigned task', async () => {
      testTask.assignedTo = testAssignee._id;
      await testTask.save();
      
      await expect(
        TaskAssignmentService.assignTask(
          testTask._id.toString(),
          testAssignee._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Task is already assigned');
    });
    
    test('throws error for completed task', async () => {
      testTask.status = 'done';
      await testTask.save();
      
      await expect(
        TaskAssignmentService.assignTask(
          testTask._id.toString(),
          testAssignee._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Cannot assign completed or cancelled task');
    });
    
    test('throws error for completed task', async () => {
      testTask.status = 'done';
      await testTask.save();
      
      await expect(
        TaskAssignmentService.assignTask(
          testTask._id.toString(),
          testAssignee._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Cannot assign completed or cancelled task');
    });
    
    test('does not change status for ready tasks', async () => {
      testTask.status = 'ready';
      await testTask.save();
      
      const result = await TaskAssignmentService.assignTask(
        testTask._id.toString(),
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(result.status).toBe('ready');
    });
  });
  
  describe('reassignTask', () => {
    test('successfully reassigns task to new member', async () => {
      // First assign to original assignee
      testTask.assignedTo = testAssignee._id;
      await testTask.save();
      
      // Create new assignee
      const newAssignee = await User.create({
        telegramId: '555666777',
        firstName: 'New',
        lastName: 'Assignee',
        username: 'newassignee',
        role: 'member'
      });
      
      testTeam.members.push({
        userId: newAssignee._id,
        username: 'newassignee',
        role: 'member',
        addedBy: testUser._id
      });
      await testTeam.save();
      
      const result = await TaskAssignmentService.reassignTask(
        testTask._id.toString(),
        newAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(result.assignedTo.toString()).toBe(newAssignee._id.toString());
    });
    
    test('throws error for non-existent task', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskAssignmentService.reassignTask(
          fakeTaskId.toString(),
          testAssignee._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Task not found');
    });
  });
  
  describe('validateAssignment', () => {
    test('allows task creator to assign task', async () => {
      const result = await TaskAssignmentService.validateAssignment(
        testTask,
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(result).toBe(true);
    });
    
    test('prevents non-creator from assigning task', async () => {
      await expect(
        TaskAssignmentService.validateAssignment(
          testTask,
          testAssignee._id.toString(),
          testAssignee._id.toString() // assignee trying to assign
        )
      ).rejects.toThrow('Only task creator can assign this task');
    });
    
    test('validates assignee is team member', async () => {
      const nonMemberId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskAssignmentService.validateAssignment(
          testTask,
          nonMemberId.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Assignee is not an active team member');
    });
    
    test('handles task without team', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const noTeamTask = await Task.create({
        title: 'No Team Task',
        description: 'Task without team',
        goal: 'Test goal',
        successMetric: 'Test metric',
        deadline: futureDate,
        createdBy: testUser._id,
        status: 'pending'
      });
      
      // Should not throw error for task without team
      const result = await TaskAssignmentService.validateAssignment(
        noTeamTask,
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(result).toBe(true);
    });
    
    test('throws error for non-existent team', async () => {
      testTask.teamId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskAssignmentService.validateAssignment(
          testTask,
          testAssignee._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Task team not found');
    });
  });
  
  describe('getAssignmentHistory', () => {
    test('returns assignment history for task', async () => {
      const history = await TaskAssignmentService.getAssignmentHistory(testTask._id.toString());
      
      expect(history).toEqual({
        currentAssignee: undefined,
        assignedAt: expect.any(Date),
        status: 'pending'
      });
    });
    
    test('throws error for non-existent task', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskAssignmentService.getAssignmentHistory(fakeTaskId.toString())
      ).rejects.toThrow('Task not found');
    });
  });
  
  describe('bulkAssignTasks', () => {
    test('successfully assigns multiple tasks', async () => {
      // Create second task
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const secondTask = await Task.create({
        title: 'Second Task',
        description: 'Second task description',
        goal: 'Second goal',
        successMetric: 'Second metric',
        deadline: futureDate,
        createdBy: testUser._id,
        teamId: testTeam._id,
        status: 'pending'
      });
      
      const taskIds = [testTask._id.toString(), secondTask._id.toString()];
      
      const results = await TaskAssignmentService.bulkAssignTasks(
        taskIds,
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Check tasks were assigned
      const updatedTask1 = await Task.findById(testTask._id);
      const updatedTask2 = await Task.findById(secondTask._id);
      
      expect(updatedTask1.assignedTo.toString()).toBe(testAssignee._id.toString());
      expect(updatedTask2.assignedTo.toString()).toBe(testAssignee._id.toString());
    });
    
    test('handles partial failures in bulk assignment', async () => {
      // Create second task that's already assigned
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const secondTask = await Task.create({
        title: 'Second Task',
        description: 'Second task description',
        goal: 'Second goal',
        successMetric: 'Second metric',
        deadline: futureDate,
        createdBy: testUser._id,
        teamId: testTeam._id,
        status: 'pending',
        assignedTo: testAssignee._id
      });
      
      const taskIds = [testTask._id.toString(), secondTask._id.toString()];
      
      const results = await TaskAssignmentService.bulkAssignTasks(
        taskIds,
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('already assigned');
    });
  });
  
  describe('Notification Methods', () => {
    test('sendAssignmentNotification logs notification', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await TaskAssignmentService.sendAssignmentNotification(
        testTask,
        testAssignee._id.toString(),
        testUser._id.toString()
      );
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Assignment notification')
      );
      
      consoleSpy.mockRestore();
    });
    
    test('sendReassignmentNotification logs notification', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await TaskAssignmentService.sendReassignmentNotification(
        testTask,
        testAssignee._id.toString(),
        testUser._id.toString(),
        testUser._id.toString(),
        'assigned'
      );
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reassignment notification')
      );
      
      consoleSpy.mockRestore();
    });
    
    test('postTaskCardToChannel logs posting', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await TaskAssignmentService.postTaskCardToChannel(
        testTask,
        'test_channel_id'
      );
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Channel posting')
      );
      
      consoleSpy.mockRestore();
    });
  });
}); 