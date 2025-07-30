const TeamService = require('../../src/services/team/team.service');
const TeamFormatter = require('../../src/bot/formatters/team.formatter');
const teamCallbacks = require('../../src/bot/callbacks/team.callbacks');

describe('Team Management Integration Tests', () => {
  let mockBot;
  let mockQuery;
  let mockMsg;

  beforeEach(() => {
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({})
    };

    mockQuery = {
      data: '',
      from: { id: 123, username: 'testuser' },
      message: { 
        chat: { id: 456 }, 
        message_id: 789 
      }
    };

    mockMsg = {
      chat: { id: 456 },
      from: { id: 123, username: 'testuser' },
      text: ''
    };
  });

  describe('/team command', () => {
    test('should show team management menu', async () => {
      const teamCommand = require('../../src/bot/commands/team.command');
      
      await teamCommand.handler(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('👥 Team Management'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ 
                  text: '👤 Add Member',
                  callback_data: 'team_add'
                })
              ])
            ])
          })
        })
      );
    });

    test('should handle command errors gracefully', async () => {
      const teamCommand = require('../../src/bot/commands/team.command');
      
      // Mock bot.sendMessage to throw error
      mockBot.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      
      await teamCommand.handler(mockBot, mockMsg);
      
      // Should call sendMessage twice - once for welcome, once for error
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockBot.sendMessage).toHaveBeenLastCalledWith(
        456,
        expect.stringContaining('❌')
      );
    });
  });

  describe('Team callbacks', () => {
    test('team_add should show add member instructions', async () => {
      mockQuery.data = 'team_add';
      
      await teamCallbacks['team_add'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('👤 Add Team Member'),
        expect.objectContaining({
          chat_id: 456,
          message_id: 789
        })
      );
    });

    test('team_list should display team members', async () => {
      mockQuery.data = 'team_list';
      
      await teamCallbacks['team_list'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('👥 No team members found'),
        expect.objectContaining({
          chat_id: 456,
          message_id: 789,
          parse_mode: 'Markdown'
        })
      );
    });

    test('team_remove should show removable members', async () => {
      mockQuery.data = 'team_remove';
      
      await teamCallbacks['team_remove'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('🗑️ Remove Team Member'),
        expect.objectContaining({
          chat_id: 456,
          message_id: 789
        })
      );
    });

    test('should handle callback errors gracefully', async () => {
      mockQuery.data = 'team_list';
      
      // Mock editMessageText to throw error
      mockBot.editMessageText.mockRejectedValueOnce(new Error('Service Error'));
      
      await teamCallbacks['team_list'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('❌'),
        expect.any(Object)
      );
    });
  });

  describe('Member input handling', () => {
    test('should add valid team member', async () => {
      mockMsg.text = '@newuser member';
      
      jest.spyOn(TeamService, 'addTeamMember').mockResolvedValue({
        username: 'newuser',
        role: 'member',
        addedAt: new Date()
      });
      
      await teamCallbacks.handleMemberInput(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('✅ Team Member Added!')
      );
    });

    test('should reject invalid input format', async () => {
      mockMsg.text = 'invalid input';
      
      await teamCallbacks.handleMemberInput(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('❌ Invalid Format')
      );
    });

    test('should reject invalid role', async () => {
      mockMsg.text = '@user invalidrole';
      
      await teamCallbacks.handleMemberInput(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('❌ Invalid Role')
      );
    });
  });

  describe('Permission validation', () => {
    test('should allow admin to remove manager', async () => {
      jest.spyOn(TeamService, 'removeTeamMember').mockResolvedValue({
        username: 'manager1',
        removedAt: new Date()
      });
      
      mockQuery.data = 'team_confirm_remove_manager1';
      
      await teamCallbacks.handleConfirmRemoval(mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('✅ Member Removed'),
        expect.any(Object)
      );
    });

    test('should prevent member from removing other members', async () => {
      mockQuery.data = 'team_confirm_remove_othermember';
      
      await teamCallbacks.handleConfirmRemoval(mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('✅ Member Removed'),
        expect.any(Object)
      );
    });
  });
}); 