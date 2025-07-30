const {
  formatTaskSelectionList,
  createTaskSelectionKeyboard,
  formatMemberSelectionMessage,
  createMemberSelectionKeyboard,
  formatAssignmentConfirmation,
  formatAssignmentSuccess,
  formatAssignmentNotification,
  formatTaskCard,
  formatErrorMessage,
  getRoleIcon,
  getTimeAgo,
  formatDate
} = require('../../../src/bot/formatters/task-assignment.formatter');

describe('TaskAssignmentFormatter', () => {
  const mockTask = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    title: 'Test Task Title',
    description: 'Test description',
    goal: 'Test goal',
    successMetric: 'Test metric',
    status: 'pending',
    createdAt: new Date('2024-12-19T10:00:00Z'),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  };
  
  const mockMember = {
    userId: '507f1f77bcf86cd799439012',
    username: 'testuser',
    role: 'member'
  };
  
  const mockAssigner = {
    username: 'adminuser',
    role: 'admin'
  };
  
  describe('formatTaskSelectionList', () => {
    test('formats single task correctly', () => {
      const result = formatTaskSelectionList([mockTask]);
      
      expect(result).toContain('Task Assignment');
      expect(result).toContain('Test Task Title');
      expect(result).toContain('#9011'); // Last 4 digits of ID
      expect(result).toContain('Pending');
      expect(result).toContain('Created:');
    });
    
    test('handles empty task list', () => {
      const result = formatTaskSelectionList([]);
      
      expect(result).toContain('All Tasks Assigned');
      expect(result).toContain('Great news!');
      expect(result).toContain('/newtask');
      expect(result).toContain('/mytasks');
    });
    
    test('handles null tasks', () => {
      const result = formatTaskSelectionList(null);
      
      expect(result).toContain('All Tasks Assigned');
    });
    
    test('formats multiple tasks', () => {
      const secondTask = {
        ...mockTask,
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        title: 'Second Task',
        status: 'ready'
      };
      
      const result = formatTaskSelectionList([mockTask, secondTask]);
      
      expect(result).toContain('Test Task Title');
      expect(result).toContain('Second Task');
      expect(result).toContain('Pending');
      expect(result).toContain('Ready');
    });
  });
  
  describe('createTaskSelectionKeyboard', () => {
    test('creates keyboard with task buttons', () => {
      const keyboard = createTaskSelectionKeyboard([mockTask]);
      
      expect(keyboard).toHaveProperty('inline_keyboard');
      expect(keyboard.inline_keyboard).toHaveLength(2); // 1 task + utility buttons
      
      const taskButton = keyboard.inline_keyboard[0][0];
      expect(taskButton.text).toContain('#9011');
      expect(taskButton.text).toContain('Test Task Title');
      expect(taskButton.callback_data).toBe(`assign_task_${mockTask._id.toString()}`);
    });
    
    test('includes utility buttons', () => {
      const keyboard = createTaskSelectionKeyboard([mockTask]);
      
      const utilityRow = keyboard.inline_keyboard[1];
      expect(utilityRow).toHaveLength(2);
      expect(utilityRow[0].text).toBe('🔍 Search Task by ID');
      expect(utilityRow[0].callback_data).toBe('assign_search');
      expect(utilityRow[1].text).toBe('❌ Cancel');
      expect(utilityRow[1].callback_data).toBe('assign_cancel');
    });
    
    test('truncates long task titles', () => {
      const longTitleTask = {
        ...mockTask,
        title: 'This is a very long task title that should be truncated at 25 characters'
      };
      
      const keyboard = createTaskSelectionKeyboard([longTitleTask]);
      const taskButton = keyboard.inline_keyboard[0][0];
      
      expect(taskButton.text).toContain('This is a very long task');
    });
  });
  
  describe('formatMemberSelectionMessage', () => {
    test('formats member selection message correctly', () => {
      const result = formatMemberSelectionMessage(mockTask);
      
      expect(result).toContain('Select Team Member');
      expect(result).toContain('Test Task Title');
      expect(result).toContain('#9011');
      expect(result).toContain('Tomorrow'); // Deadline formatting
    });
    
    test('handles task without deadline', () => {
      const taskWithoutDeadline = { ...mockTask, deadline: null };
      const result = formatMemberSelectionMessage(taskWithoutDeadline);
      
      expect(result).toContain('Select Team Member');
      expect(result).not.toContain('📅 Deadline:');
    });
  });
  
  describe('createMemberSelectionKeyboard', () => {
    test('creates keyboard with member buttons', () => {
      const members = [mockMember];
      const keyboard = createMemberSelectionKeyboard(members, mockTask._id.toString());
      
      expect(keyboard).toHaveProperty('inline_keyboard');
      expect(keyboard.inline_keyboard).toHaveLength(2); // 1 member + navigation buttons
      
      const memberButton = keyboard.inline_keyboard[0][0];
      expect(memberButton.text).toContain('👤 @testuser');
      expect(memberButton.text).toContain('(member)');
      expect(memberButton.callback_data).toBe(`assign_to_testuser_${mockTask._id.toString()}`);
    });
    
    test('includes navigation buttons', () => {
      const keyboard = createMemberSelectionKeyboard([mockMember], mockTask._id.toString());
      
      const navRow = keyboard.inline_keyboard[1];
      expect(navRow).toHaveLength(2);
      expect(navRow[0].text).toBe('🔙 Back');
      expect(navRow[0].callback_data).toBe('assign_back');
      expect(navRow[1].text).toBe('❌ Cancel');
      expect(navRow[1].callback_data).toBe('assign_cancel');
    });
    
    test('handles multiple members with different roles', () => {
      const adminMember = { ...mockMember, username: 'adminuser', role: 'admin' };
      const managerMember = { ...mockMember, username: 'manageruser', role: 'manager' };
      const members = [adminMember, managerMember, mockMember];
      
      const keyboard = createMemberSelectionKeyboard(members, mockTask._id.toString());
      
      expect(keyboard.inline_keyboard[0]).toHaveLength(1);
      expect(keyboard.inline_keyboard[1]).toHaveLength(1);
      expect(keyboard.inline_keyboard[2]).toHaveLength(1);
      expect(keyboard.inline_keyboard[0][0].text).toContain('👨‍💼 @adminuser');
      expect(keyboard.inline_keyboard[1][0].text).toContain('👨‍💻 @manageruser');
      expect(keyboard.inline_keyboard[2][0].text).toContain('👤 @testuser');
    });
  });
  
  describe('formatAssignmentConfirmation', () => {
    test('formats confirmation message with all details', () => {
      const result = formatAssignmentConfirmation(mockTask, mockMember);
      
      expect(result).toContain('Confirm Assignment');
      expect(result).toContain('Test Task Title');
      expect(result).toContain('👤 @testuser');
      expect(result).toContain('(member)');
      expect(result).toContain('Test metric');
      expect(result).toContain('This will notify @testuser immediately');
    });
    
    test('handles task without success metric', () => {
      const taskWithoutMetric = { ...mockTask, successMetric: null };
      const result = formatAssignmentConfirmation(taskWithoutMetric, mockMember);
      
      expect(result).toContain('Not specified');
    });
  });
  
  describe('formatAssignmentSuccess', () => {
    test('formats success message with all details', () => {
      const result = formatAssignmentSuccess(mockTask, mockMember);
      
      expect(result).toContain('Task Assigned Successfully');
      expect(result).toContain('Test Task Title');
      expect(result).toContain('👤 @testuser');
      expect(result).toContain('Test metric');
      expect(result).toContain('#9011');
      expect(result).toContain('Notification sent to @testuser');
      expect(result).toContain('Task card posted to team channel');
    });
    
    test('handles task without deadline', () => {
      const taskWithoutDeadline = { ...mockTask, deadline: null };
      const result = formatAssignmentSuccess(taskWithoutDeadline, mockMember);
      
      expect(result).toContain('Deadline: Not set');
    });
  });
  
  describe('formatAssignmentNotification', () => {
    test('formats notification message for assignee', () => {
      const result = formatAssignmentNotification(mockTask, mockAssigner);
      
      expect(result).toContain('New Task Assigned to You');
      expect(result).toContain('Test Task Title');
      expect(result).toContain('Assigned by: @adminuser');
      expect(result).toContain('Test goal');
      expect(result).toContain('Test description');
      expect(result).toContain('#9011');
      expect(result).toContain('/accept_9011');
      expect(result).toContain('/mytasks');
      expect(result).toContain('/task_9011');
    });
    
    test('handles missing assigner username', () => {
      const assignerWithoutUsername = { role: 'admin' };
      const result = formatAssignmentNotification(mockTask, assignerWithoutUsername);
      
      expect(result).toContain('Assigned by: @Team Admin');
    });
    
    test('handles task without goal and description', () => {
      const taskWithoutDetails = { ...mockTask, goal: null, description: null };
      const result = formatAssignmentNotification(taskWithoutDetails, mockAssigner);
      
      expect(result).toContain('Goal: Not specified');
      expect(result).toContain('Description: No description provided');
    });
  });
  
  describe('formatTaskCard', () => {
    test('formats task card for channel posting', () => {
      const result = formatTaskCard(mockTask, mockMember);
      
      expect(result).toContain('New Task Assignment');
      expect(result).toContain('**Test Task Title**');
      expect(result).toContain('#9011');
      expect(result).toContain('👤 @testuser');
      expect(result).toContain('By: @Team Admin');
      expect(result).toContain('Test metric');
      expect(result).toContain('/task_9011');
    });
    
    test('handles task with creator username', () => {
      const taskWithCreator = { ...mockTask, createdBy: { username: 'creatoruser' } };
      const result = formatTaskCard(taskWithCreator, mockMember);
      
      expect(result).toContain('By: @creatoruser');
    });
  });
  
  describe('formatErrorMessage', () => {
    test('formats task not found error', () => {
      const result = formatErrorMessage('task_not_found', { taskId: '1234' });
      
      expect(result).toContain('Task Not Found');
      expect(result).toContain('Task #1234');
      expect(result).toContain('Use /assign to see available tasks');
    });
    
    test('formats permission denied error', () => {
      const result = formatErrorMessage('permission_denied');
      
      expect(result).toContain('Permission Denied');
      expect(result).toContain('Contact your team admin');
    });
    
    test('formats member not found error', () => {
      const result = formatErrorMessage('member_not_found', { username: 'testuser' });
      
      expect(result).toContain('Team Member Not Found');
      expect(result).toContain('@testuser');
      expect(result).toContain('Use /team list');
    });
    
    test('formats already assigned error', () => {
      const result = formatErrorMessage('already_assigned', { 
        taskId: '1234', 
        currentAssignee: 'testuser' 
      });
      
      expect(result).toContain('Task Already Assigned');
      expect(result).toContain('Task #1234');
      expect(result).toContain('@testuser');
    });
    
    test('formats invalid status error', () => {
      const result = formatErrorMessage('invalid_status', { taskId: '1234' });
      
      expect(result).toContain('Cannot Assign Task');
      expect(result).toContain('already completed');
    });
    
    test('formats no team members error', () => {
      const result = formatErrorMessage('no_team_members');
      
      expect(result).toContain('No Team Members');
      expect(result).toContain('Use /team add');
    });
    
    test('returns default error for unknown type', () => {
      const result = formatErrorMessage('unknown_error');
      
      expect(result).toBe('❌ Something went wrong. Please try again.');
    });
  });
  
  describe('Helper Functions', () => {
    test('getRoleIcon returns correct icons', () => {
      expect(getRoleIcon('admin')).toBe('👨‍💼');
      expect(getRoleIcon('manager')).toBe('👨‍💻');
      expect(getRoleIcon('member')).toBe('👤');
      expect(getRoleIcon('unknown')).toBe('👤'); // Default
    });
    
    test('getTimeAgo calculates time correctly', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      expect(getTimeAgo(oneHourAgo)).toContain('1 hour ago');
      expect(getTimeAgo(oneDayAgo)).toContain('1 day ago');
      expect(getTimeAgo(twoDaysAgo)).toContain('2 days ago');
    });
    
    test('getTimeAgo handles recent times', () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      expect(getTimeAgo(recentTime)).toBe('Less than 1 hour ago');
    });
    
    test('formatDate formats dates correctly', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 5);
      const farFuture = new Date(today);
      farFuture.setDate(farFuture.getDate() + 10);
      
      expect(formatDate(today)).toBe('Today');
      expect(formatDate(tomorrow)).toBe('Tomorrow');
      expect(formatDate(nextWeek)).toBe('In 5 days');
      expect(formatDate(farFuture)).toMatch(/[A-Za-z]{3}, [A-Za-z]{3} \d+/); // e.g., "Thu, Dec 26"
    });
    
    test('formatDate handles null dates', () => {
      expect(formatDate(null)).toBe('Not set');
    });
  });
}); 