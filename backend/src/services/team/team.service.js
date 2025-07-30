const Team = require('../../models/team.model');
const { ValidationError } = require('../../utils/errors');

class TeamService {
  
  async getOrCreateTeam(userId) {
    try {
      // First, find existing team where user is a member
      let team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        // Create new team with user as admin
        team = new Team({
          name: 'My Team',
          description: 'Default team',
          createdBy: userId,
          members: [{
            userId: userId,
            username: 'admin', // Will be updated when we have user data
            role: 'admin',
            addedBy: userId,
            addedAt: new Date()
          }]
        });
        
        await team.save();
      }
      
      return team;
    } catch (error) {
      console.error('Get or create team error:', error);
      throw new Error('Failed to access team');
    }
  }
  
  async addTeamMember(userId, username, role) {
    try {
      // Validate inputs
      if (!username.startsWith('@')) {
        throw new ValidationError('Username must start with @');
      }
      
      const cleanUsername = username.substring(1); // Remove @
      
      if (!['member', 'manager', 'admin'].includes(role)) {
        throw new ValidationError('Invalid role');
      }
      
      // Get or create team
      const team = await this.getOrCreateTeam(userId);
      
      // Check if member already exists
      const existingMember = team.members.find(
        member => member.username === cleanUsername
      );
      
      if (existingMember) {
        throw new ValidationError(`@${cleanUsername} is already a team member`);
      }
      
      // Check permissions - get current user's role
      const currentMember = team.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      if (!currentMember) {
        throw new ValidationError('You are not a team member');
      }
      
      // Permission checks
      const canAdd = this.checkAddPermission(currentMember.role, role);
      if (!canAdd) {
        throw new ValidationError(`You cannot add ${role}s to the team`);
      }
      
      // Add new member
      team.members.push({
        userId: null, // Will be populated when user joins
        username: cleanUsername,
        role: role,
        addedBy: userId,
        addedAt: new Date()
      });
      
      await team.save();
      
      return {
        username: cleanUsername,
        role: role,
        addedAt: new Date()
      };
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Add team member error:', error);
      throw new Error('Failed to add team member');
    }
  }
  
  async removeTeamMember(userId, targetUsername) {
    try {
      const cleanUsername = targetUsername.replace('@', '');
      
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        throw new ValidationError('Team not found');
      }
      
      // Find current user and target member
      const currentMember = team.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      const targetMember = team.members.find(
        member => member.username === cleanUsername
      );
      
      if (!currentMember) {
        throw new ValidationError('You are not a team member');
      }
      
      if (!targetMember) {
        throw new ValidationError('Member not found');
      }
      
      // Check if trying to remove self and is only admin
      if (currentMember.username === cleanUsername) {
        const adminCount = team.members.filter(m => m.role === 'admin').length;
        if (adminCount === 1 && currentMember.role === 'admin') {
          throw new ValidationError('Cannot remove yourself as the only admin');
        }
      }
      
      // Check permissions
      const canRemove = this.checkRemovePermission(currentMember.role, targetMember.role);
      if (!canRemove) {
        throw new ValidationError('You don\'t have permission to remove this member');
      }
      
      // Remove member
      team.members = team.members.filter(
        member => member.username !== cleanUsername
      );
      
      await team.save();
      
      return {
        username: cleanUsername,
        removedAt: new Date()
      };
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Remove team member error:', error);
      throw new Error('Failed to remove team member');
    }
  }
  
  async getTeamMembers(userId) {
    try {
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        return [];
      }
      
      // Add flag for current user
      return team.members.map(member => ({
        ...member.toObject(),
        isCurrentUser: member.userId && member.userId.toString() === userId.toString()
      }));
      
    } catch (error) {
      console.error('Get team members error:', error);
      throw new Error('Failed to get team members');
    }
  }
  
  async getRemovableMembers(userId) {
    try {
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        return [];
      }
      
      const currentMember = team.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      if (!currentMember) {
        return [];
      }
      
      // Filter members that current user can remove
      return team.members.filter(member => {
        // Don't include self if only admin
        if (member.userId.toString() === userId.toString()) {
          const adminCount = team.members.filter(m => m.role === 'admin').length;
          return !(adminCount === 1 && member.role === 'admin');
        }
        
        // Check if current user can remove this member
        return this.checkRemovePermission(currentMember.role, member.role);
      });
      
    } catch (error) {
      console.error('Get removable members error:', error);
      throw new Error('Failed to get removable members');
    }
  }
  
  // Permission helper methods
  checkAddPermission(userRole, targetRole) {
    const roleHierarchy = { admin: 3, manager: 2, member: 1 };
    return roleHierarchy[userRole] >= roleHierarchy[targetRole];
  }
  
  checkRemovePermission(userRole, targetRole) {
    if (userRole === 'admin') return true;
    if (userRole === 'manager' && targetRole === 'member') return true;
    return false;
  }
}

module.exports = new TeamService(); 