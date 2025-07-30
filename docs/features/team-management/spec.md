# Team Management Specification

## Overview
Team Management feature allows users to create and manage teams for task delegation using Elon Musk's delegation principles. Users can add team members, assign roles (member/manager/admin), list all members, and remove members with proper authorization controls.

## User Flow
1. User types `/team` command
2. Bot displays team management menu with 4 options
3. **Add Member**: User provides username and role, bot validates and adds
4. **List Members**: Bot shows all team members grouped by role 
5. **Remove Member**: User selects member from list, confirms removal
6. **Team Settings**: Configure team preferences and permissions

## Bot Commands
- `/team` - Open team management interface
- Callback queries: `team_add`, `team_list`, `team_remove`, `team_settings`

## Database Requirements
- **Team Model** (new): team name, description, creator, members array
- **User Model** (existing): uses role field (member/manager/admin)
- **Task Model** (existing): uses teamId field for assignment

### New Team Contract Fields:
```javascript
{
  name: 'String',           // Team name
  description: 'String',    // Team description  
  createdBy: 'ObjectId',    // Creator reference
  members: 'Array',         // Array of member objects
  settings: {
    allowMemberInvite: 'Boolean',
    requireApproval: 'Boolean'
  }
}
```

## Message Templates
- **Welcome**: "👥 Team Management\n\nChoose an action:"
- **Add Success**: "✅ Team Member Added!\n\n👤 @{username}\n🏷️ Role: {role}"  
- **List Format**: "📋 Team Members ({count})\n\n👑 **Admins:**\n• @{username}"
- **Remove Confirm**: "⚠️ Confirm Removal\n\nRemove @{username} ({role}) from team?"

## Validation Rules
- **Username**: Must start with @, exist on Telegram
- **Role**: Must be one of: member, manager, admin
- **Permissions**: Only admins can remove managers, managers can remove members
- **Self-removal**: Users cannot remove themselves if they're the only admin

## Authorization Rules
- **Add Members**: All roles can add members with equal or lower role
- **Remove Members**: Admins can remove anyone, managers can remove members only
- **View Members**: All team members can view the list
- **Team Settings**: Only admins and managers can modify settings

## Error Handling
- Invalid username format → "❌ Please use format: @username role"
- User not found → "❌ User @{username} not found on Telegram"
- Permission denied → "❌ You don't have permission for this action"
- Self-removal attempt → "❌ Cannot remove yourself as the only admin"

## Success Metrics
- Users can successfully add team members in under 30 seconds
- Role-based permissions prevent unauthorized actions
- Clear error messages guide users to correct input
- Team list displays clearly with role hierarchy