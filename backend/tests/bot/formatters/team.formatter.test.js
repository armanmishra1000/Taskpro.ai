const TeamFormatter = require('../../../src/bot/formatters/team.formatter');

describe('TeamFormatter', () => {
  describe('formatMembersList', () => {
    test('should format empty team', () => {
      const result = TeamFormatter.formatMembersList([]);
      
      expect(result).toContain('👥 No team members found');
      expect(result).toContain('Use "Add Member"');
    });

    test('should format team with mixed roles', () => {
      const members = [
        { username: 'admin1', role: 'admin', isCurrentUser: true },
        { username: 'manager1', role: 'manager', isCurrentUser: false },
        { username: 'member1', role: 'member', isCurrentUser: false }
      ];

      const result = TeamFormatter.formatMembersList(members);

      expect(result).toContain('📋 Team Members (3)');
      expect(result).toContain('👑 **Admins:**');
      expect(result).toContain('• @admin1 (You)');
      expect(result).toContain('👨‍💼 **Managers:**');
      expect(result).toContain('• @manager1');
      expect(result).toContain('👥 **Members:**');
      expect(result).toContain('• @member1');
    });

    test('should handle current user flag correctly', () => {
      const members = [
        { username: 'user1', role: 'admin', isCurrentUser: false },
        { username: 'user2', role: 'member', isCurrentUser: true }
      ];

      const result = TeamFormatter.formatMembersList(members);

      expect(result).toContain('• @user1');
      expect(result).not.toContain('• @user1 (You)');
      expect(result).toContain('• @user2 (You)');
    });

    test('should handle single role teams', () => {
      const members = [
        { username: 'admin1', role: 'admin', isCurrentUser: true },
        { username: 'admin2', role: 'admin', isCurrentUser: false }
      ];

      const result = TeamFormatter.formatMembersList(members);

      expect(result).toContain('👑 **Admins:**');
      expect(result).toContain('• @admin1 (You)');
      expect(result).toContain('• @admin2');
      expect(result).not.toContain('👨‍💼 **Managers:**');
      expect(result).not.toContain('👥 **Members:**');
    });

    test('should handle null/undefined members', () => {
      const result = TeamFormatter.formatMembersList(null);
      expect(result).toContain('👥 No team members found');
    });
  });

  describe('formatMemberCard', () => {
    test('should format member card correctly', () => {
      const member = {
        username: 'testuser',
        role: 'manager',
        addedAt: new Date('2024-12-27')
      };

      const result = TeamFormatter.formatMemberCard(member);

      expect(result).toContain('👨‍💼 @testuser');
      expect(result).toContain('🏷️ Role: Manager');
      expect(result).toContain('📅 Added: Dec 27, 2024');
    });

    test('should handle missing addedAt', () => {
      const member = {
        username: 'testuser',
        role: 'member'
      };

      const result = TeamFormatter.formatMemberCard(member);

      expect(result).toContain('👥 @testuser');
      expect(result).toContain('🏷️ Role: Member');
      expect(result).toContain('📅 Added: Unknown');
    });
  });

  describe('formatAddMemberSuccess', () => {
    test('should format success message correctly', () => {
      const member = {
        username: 'newuser',
        role: 'member',
        addedAt: new Date('2024-12-27')
      };

      const result = TeamFormatter.formatAddMemberSuccess(member, 5);

      expect(result).toContain('✅ Team Member Added!');
      expect(result).toContain('👤 @newuser');
      expect(result).toContain('🏷️ Role: Member');
      expect(result).toContain('📅 Added: Dec 27, 2024');
      expect(result).toContain('Total team members: 5');
    });
  });

  describe('formatRemoveMemberSuccess', () => {
    test('should format removal success message', () => {
      const result = TeamFormatter.formatRemoveMemberSuccess('removeduser', 3);

      expect(result).toContain('✅ Member Removed');
      expect(result).toContain('@removeduser has been removed from the team');
      expect(result).toContain('Remaining team members: 3');
    });
  });

  describe('createMainTeamKeyboard', () => {
    test('should create main team keyboard', () => {
      const keyboard = TeamFormatter.createMainTeamKeyboard();

      expect(keyboard.inline_keyboard).toHaveLength(4);
      expect(keyboard.inline_keyboard[0][0].text).toBe('👤 Add Member');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('team_add');
      expect(keyboard.inline_keyboard[1][0].text).toBe('📋 List Members');
      expect(keyboard.inline_keyboard[1][0].callback_data).toBe('team_list');
      expect(keyboard.inline_keyboard[2][0].text).toBe('🗑️ Remove Member');
      expect(keyboard.inline_keyboard[2][0].callback_data).toBe('team_remove');
      expect(keyboard.inline_keyboard[3][0].text).toBe('⚙️ Team Settings');
      expect(keyboard.inline_keyboard[3][0].callback_data).toBe('team_settings');
    });
  });

  describe('createMemberRemovalKeyboard', () => {
    test('should create keyboard with member options', () => {
      const members = [
        { username: 'member1', role: 'member' },
        { username: 'manager1', role: 'manager' }
      ];

      const keyboard = TeamFormatter.createMemberRemovalKeyboard(members);

      expect(keyboard.inline_keyboard).toHaveLength(3); // 2 members + cancel
      expect(keyboard.inline_keyboard[0][0].text).toContain('@member1');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('team_remove_member1');
      expect(keyboard.inline_keyboard[2][0].text).toBe('❌ Cancel');
    });

    test('should handle empty members list', () => {
      const keyboard = TeamFormatter.createMemberRemovalKeyboard([]);

      expect(keyboard.inline_keyboard).toHaveLength(1);
      expect(keyboard.inline_keyboard[0][0].text).toBe('❌ Cancel');
    });

    test('should include role icons in button text', () => {
      const members = [
        { username: 'admin1', role: 'admin' },
        { username: 'member1', role: 'member' }
      ];

      const keyboard = TeamFormatter.createMemberRemovalKeyboard(members);

      expect(keyboard.inline_keyboard[0][0].text).toContain('👑');
      expect(keyboard.inline_keyboard[1][0].text).toContain('👥');
    });
  });

  describe('createConfirmationKeyboard', () => {
    test('should create confirmation keyboard', () => {
      const keyboard = TeamFormatter.createConfirmationKeyboard('remove', 'testuser');

      expect(keyboard.inline_keyboard).toHaveLength(2);
      expect(keyboard.inline_keyboard[0][0].text).toBe('✅ Confirm');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('team_confirm_remove_testuser');
      expect(keyboard.inline_keyboard[1][0].text).toBe('❌ Cancel');
      expect(keyboard.inline_keyboard[1][0].callback_data).toBe('team_cancel');
    });
  });

  describe('createRoleSelectionKeyboard', () => {
    test('should create role selection keyboard', () => {
      const keyboard = TeamFormatter.createRoleSelectionKeyboard('testuser');

      expect(keyboard.inline_keyboard).toHaveLength(4);
      expect(keyboard.inline_keyboard[0][0].text).toBe('👥 Member');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('team_role_member_testuser');
      expect(keyboard.inline_keyboard[1][0].text).toBe('👨‍💼 Manager');
      expect(keyboard.inline_keyboard[1][0].callback_data).toBe('team_role_manager_testuser');
      expect(keyboard.inline_keyboard[2][0].text).toBe('👑 Admin');
      expect(keyboard.inline_keyboard[2][0].callback_data).toBe('team_role_admin_testuser');
      expect(keyboard.inline_keyboard[3][0].text).toBe('❌ Cancel');
    });
  });

  describe('helper functions', () => {
    test('getRoleIcon should return correct icons', () => {
      expect(TeamFormatter.getRoleIcon('admin')).toBe('👑');
      expect(TeamFormatter.getRoleIcon('manager')).toBe('👨‍💼');
      expect(TeamFormatter.getRoleIcon('member')).toBe('👥');
      expect(TeamFormatter.getRoleIcon('unknown')).toBe('👤');
    });

    test('formatDate should format dates correctly', () => {
      const date = new Date('2024-12-27');
      const result = TeamFormatter.formatDate(date);
      
      expect(result).toMatch(/Dec 27, 2024/);
    });

    test('formatDate should handle null/undefined', () => {
      expect(TeamFormatter.formatDate(null)).toBe('Unknown');
      expect(TeamFormatter.formatDate(undefined)).toBe('Unknown');
    });

    test('formatDateTime should format datetime correctly', () => {
      const date = new Date('2024-12-27T14:30:00');
      const result = TeamFormatter.formatDateTime(date);
      
      expect(result).toMatch(/Dec 27, 2024/);
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time format
    });
  });

  describe('error formatting', () => {
    test('formatValidationError should return correct error messages', () => {
      expect(TeamFormatter.formatValidationError('Invalid role'))
        .toContain('❌ Invalid Role');
      expect(TeamFormatter.formatValidationError('Username must start with @'))
        .toContain('❌ Invalid Format');
      expect(TeamFormatter.formatValidationError('Permission denied'))
        .toContain('❌ Permission Denied');
    });

    test('formatValidationError should handle unknown errors', () => {
      const result = TeamFormatter.formatValidationError('Unknown error');
      expect(result).toBe('❌ Error: Unknown error');
    });

    test('formatPermissionError should format permission errors', () => {
      const result = TeamFormatter.formatPermissionError('member', 'admin');
      
      expect(result).toContain('❌ Permission Denied');
      expect(result).toContain('Current role: member');
      expect(result).toContain('Required role: admin');
    });
  });
}); 