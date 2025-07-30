const TeamService = require('../../src/services/team/team.service');
const Team = require('../../src/models/team.model');
const { ValidationError } = require('../../src/utils/errors');

jest.mock('../../src/models/team.model');

describe('TeamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTeamMember', () => {
    test('should add valid team member', async () => {
      const mockTeam = {
        members: [{
          userId: 'user123',
          username: 'admin',
          role: 'admin'
        }],
        save: jest.fn().mockResolvedValue(true)
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.addTeamMember('user123', '@newuser', 'member');

      expect(result.username).toBe('newuser');
      expect(result.role).toBe('member');
      expect(mockTeam.save).toHaveBeenCalled();
    });

    test('should validate username format', async () => {
      await expect(
        TeamService.addTeamMember('user123', 'invalidusername', 'member')
      ).rejects.toThrow('Username must start with @');
    });

    test('should validate role', async () => {
      await expect(
        TeamService.addTeamMember('user123', '@user', 'invalidrole')
      ).rejects.toThrow('Invalid role');
    });

    test('should prevent duplicate members', async () => {
      const mockTeam = {
        members: [{
          userId: 'user123',
          username: 'admin',
          role: 'admin'
        }, {
          userId: 'user456',
          username: 'existing',
          role: 'member'
        }],
        save: jest.fn()
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.addTeamMember('user123', '@existing', 'member')
      ).rejects.toThrow('is already a team member');
    });

    test('should check add permissions', async () => {
      const mockTeam = {
        members: [{
          userId: 'member123',
          username: 'member1',
          role: 'member'
        }],
        save: jest.fn()
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.addTeamMember('member123', '@newuser', 'admin')
      ).rejects.toThrow('You cannot add admins to the team');
    });
  });

  describe('removeTeamMember', () => {
    test('should remove team member with valid permissions', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' },
          { userId: 'member456', username: 'member1', role: 'member' }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.removeTeamMember('admin123', 'member1');

      expect(result.username).toBe('member1');
      expect(mockTeam.members).toHaveLength(1);
      expect(mockTeam.save).toHaveBeenCalled();
    });

    test('should prevent removing only admin', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.removeTeamMember('admin123', 'admin')
      ).rejects.toThrow('Cannot remove yourself as the only admin');
    });

    test('should check remove permissions', async () => {
      const mockTeam = {
        members: [
          { userId: 'member123', username: 'member1', role: 'member' },
          { userId: 'member456', username: 'member2', role: 'member' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.removeTeamMember('member123', 'member2')
      ).rejects.toThrow('You don\'t have permission to remove this member');
    });

    test('should handle member not found', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.removeTeamMember('admin123', 'nonexistent')
      ).rejects.toThrow('Member not found');
    });
  });

  describe('getTeamMembers', () => {
    test('should return team members with current user flag', async () => {
      const mockTeam = {
        members: [
          { 
            userId: 'user123', 
            username: 'admin', 
            role: 'admin',
            toObject: () => ({ userId: 'user123', username: 'admin', role: 'admin' })
          },
          { 
            userId: 'user456', 
            username: 'member1', 
            role: 'member',
            toObject: () => ({ userId: 'user456', username: 'member1', role: 'member' })
          }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.getTeamMembers('user123');

      expect(result).toHaveLength(2);
      expect(result[0].isCurrentUser).toBe(true);
      expect(result[1].isCurrentUser).toBe(false);
    });

    test('should return empty array for non-member', async () => {
      Team.findOne.mockResolvedValue(null);

      const result = await TeamService.getTeamMembers('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getRemovableMembers', () => {
    test('should return members that can be removed by admin', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' },
          { userId: 'manager456', username: 'manager1', role: 'manager' },
          { userId: 'member789', username: 'member1', role: 'member' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.getRemovableMembers('admin123');

      expect(result).toHaveLength(2); // admin can remove manager and member
    });

    test('should exclude self if only admin', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.getRemovableMembers('admin123');

      expect(result).toHaveLength(0); // cannot remove self as only admin
    });

    test('should return empty array for non-member', async () => {
      Team.findOne.mockResolvedValue(null);

      const result = await TeamService.getRemovableMembers('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getOrCreateTeam', () => {
    test('should return existing team', async () => {
      const mockTeam = {
        name: 'Existing Team',
        members: [{ userId: 'user123', username: 'admin', role: 'admin' }]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.getOrCreateTeam('user123');

      expect(result).toBe(mockTeam);
      expect(Team.findOne).toHaveBeenCalledWith({
        'members.userId': 'user123',
        isDeleted: false
      });
    });

    test('should create new team if none exists', async () => {
      Team.findOne.mockResolvedValue(null);

      const mockNewTeam = {
        name: 'My Team',
        members: [{ userId: 'user123', username: 'admin', role: 'admin' }],
        save: jest.fn().mockResolvedValue(true)
      };

      Team.mockImplementation(() => mockNewTeam);

      const result = await TeamService.getOrCreateTeam('user123');

      expect(result).toBe(mockNewTeam);
      expect(mockNewTeam.save).toHaveBeenCalled();
    });
  });

  describe('permission checking', () => {
    test('checkAddPermission should work correctly', () => {
      expect(TeamService.checkAddPermission('admin', 'admin')).toBe(true);
      expect(TeamService.checkAddPermission('admin', 'member')).toBe(true);
      expect(TeamService.checkAddPermission('member', 'admin')).toBe(false);
      expect(TeamService.checkAddPermission('manager', 'member')).toBe(true);
    });

    test('checkRemovePermission should work correctly', () => {
      expect(TeamService.checkRemovePermission('admin', 'manager')).toBe(true);
      expect(TeamService.checkRemovePermission('manager', 'member')).toBe(true);
      expect(TeamService.checkRemovePermission('member', 'admin')).toBe(false);
      expect(TeamService.checkRemovePermission('member', 'member')).toBe(false);
    });
  });
}); 