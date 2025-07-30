const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');
const Team = require('../../src/models/team.model');
const User = require('../../src/models/user.model');
const assignCommand = require('../../src/bot/commands/assign.command');
const assignmentCallbacks = require('../../src/bot/callbacks/task-assignment.callbacks');

// Mock bot for testing
const mockBot = {
  sendMessage: jest.fn(),
  editMessageText: jest.fn(),
  answerCallbackQuery: jest.fn()
};

describe('Task Assignment Integration Tests', () => {
  let testTask, testTeam, testUser, testAssignee;
  
  beforeEach(async () => {
    // Clear all test data
    await Task.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
    
    // Clear assignment states
    assignCommand.assignmentStates.clear();
    
    // Create test user
    testUser = await User.create({
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'admin'
    });
    
    // Create test assignee
    testAssignee = await User.create({
      telegramId: '987654321',
      firstName: 'Test',
      lastName: 'Assignee',
      username: 'testassignee',
      role: 'member'
    });
    
    // Create test team
    testTeam = await Team.create({
      name: 'Test Team',
      createdBy: testUser._id,
      members: [
        {
          userId: testUser._id,
          username: 'testuser',
          role: 'admin',
          addedBy: testUser._id,
          addedAt: new Date()
        },
        {
          userId: testAssignee._id,
          username: 'testassignee',
          role: 'member',
          addedBy: testUser._id,
          addedAt: new Date()
        }
      ]
    });
    
    // Create test task with future deadline
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
    
    testTask = await Task.create({
      title: 'Test Task',
      description: 'Test task description',
      goal: 'Complete the test',
      successMetric: 'Task is completed successfully',
      deadline: futureDate,
      createdBy: testUser._id,
      teamId: testTeam._id,
      status: 'pending'
    });
    
    // Clear mock calls
    jest.clearAllMocks();
  });
  
  describe('/assign Command', () => {
    test('shows unassigned tasks when available', async () => {
      const msg = {
        chat: { id: 12345 },
        from: { id: testUser._id.toString() }
      };
      
      await assignCommand.handler(mockBot, msg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('Task Assignment'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Test Task'),
                  callback_data: `assign_task_${testTask._id}`
                })
              ])
            ])
          })
        })
      );
    });
    
    test('shows no tasks message when all assigned', async () => {
      // Assign the test task
      testTask.assignedTo = testAssignee._id;
      await testTask.save();
      
      const msg = {
        chat: { id: 12345 },
        from: { id: testUser._id.toString() }
      };
      
      await assignCommand.handler(mockBot, msg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('All Tasks Assigned'),
        expect.any(Object)
      );
    });
  });
  
  describe('Task Selection Callback', () => {
    test('shows team member selection after task selection', async () => {
      const query = {
        data: `assign_task_${testTask._id}`,
        message: { chat: { id: 12345 }, message_id: 1 },
        from: { id: testUser._id.toString() }
      };
      
      await assignmentCallbacks.handleDynamicCallback(mockBot, query);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Select Team Member'),
        expect.objectContaining({
          chat_id: 12345,
          message_id: 1,
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('@testassignee'),
                  callback_data: `assign_to_testassignee_${testTask._id}`
                })
              ])
            ])
          })
        })
      );
    });
    
    test('handles task not found error', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();
      const query = {
        data: `assign_task_${fakeTaskId}`,
        message: { chat: { id: 12345 }, message_id: 1 },
        from: { id: testUser._id.toString() }
      };
      
      await assignmentCallbacks.handleDynamicCallback(mockBot, query);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Not found'),
        expect.objectContaining({
          chat_id: 12345,
          message_id: 1
        })
      );
    });
  });
  
  describe('Member Assignment Callback', () => {
    test('successfully assigns task to team member', async () => {
      const query = {
        data: `assign_to_testassignee_${testTask._id}`,
        message: { chat: { id: 12345 }, message_id: 1 },
        from: { id: testUser._id.toString() }
      };
      
      await assignmentCallbacks.handleDynamicCallback(mockBot, query);
      
      // Check database was updated
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.assignedTo.toString()).toBe(testAssignee._id.toString());
      
      // Check success message was sent
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Task Assigned Successfully'),
        expect.objectContaining({
          chat_id: 12345,
          message_id: 1
        })
      );
    });
  });
  
  describe('Cancel and Back Navigation', () => {
    test('handles assignment cancellation', async () => {
      const query = {
        data: 'assign_cancel',
        message: { chat: { id: 12345 }, message_id: 1 },
        from: { id: testUser._id.toString() }
      };
      
      await assignmentCallbacks['assign_cancel'](mockBot, query);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Assignment cancelled'),
        expect.objectContaining({
          chat_id: 12345,
          message_id: 1
        })
      );
    });
  });
  
  describe('Search Functionality', () => {
    test('handles search callback', async () => {
      const query = {
        data: 'assign_search',
        message: { chat: { id: 12345 }, message_id: 1 },
        from: { id: testUser._id.toString() }
      };
      
      await assignmentCallbacks['assign_search'](mockBot, query);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Task Search'),
        expect.objectContaining({
          chat_id: 12345,
          message_id: 1
        })
      );
    });
  });
  
  describe('State Management', () => {
    test('clears assignment state after cancellation', async () => {
      const query = {
        data: 'assign_cancel',
        message: { chat: { id: 12345 }, message_id: 1 },
        from: { id: testUser._id.toString() }
      };
      
      // Set initial state
      assignCommand.assignmentStates.set(testUser._id.toString(), {
        step: 'member_selection',
        selectedTask: testTask._id.toString()
      });
      
      await assignmentCallbacks['assign_cancel'](mockBot, query);
      
      // Check state was cleared
      expect(assignCommand.assignmentStates.has(testUser._id.toString())).toBe(false);
    });
  });
}); 