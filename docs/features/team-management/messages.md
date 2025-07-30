# Team Management Bot Messages

## Command: /team

### Initial Message
```
👥 Team Management

Choose an action:
```

### Add Member Flow

**Add Member Instructions:**
```
👤 Add Team Member

Please provide member information:
Format: @username Role

Examples:
• @john_doe manager
• @jane_smith member  
• @admin_user admin

Roles: member, manager, admin
```

**Add Member Success:**
```
✅ Team Member Added!

👤 @{username}
🏷️ Role: {role}
📅 Added: {date}

Total team members: {count}
```

**Role Updated:**
```
✅ Role Updated!

👤 @{username}
🏷️ New Role: {role}
📅 Updated: {date}
```

### List Members Flow

**Team Members List:**
```
📋 Team Members ({count})

👑 **Admins:**
{admin_list}

👨‍💼 **Managers:**  
{manager_list}

👥 **Members:**
{member_list}

Use /team remove to remove members
```

**Empty Team:**
```
👥 No team members found

Use "Add Member" to start building your team.
```

### Remove Member Flow

**Remove Member Selection:**
```
🗑️ Remove Team Member

Select member to remove:
```

**Remove Confirmation:**
```
⚠️ Confirm Removal

Remove @{username} ({role}) from team?
This action cannot be undone.

Tasks assigned to this member will need reassignment.
```

**Remove Success:**
```
✅ Member Removed

@{username} has been removed from the team.

Remaining team members: {count}
```

### Team Settings Flow

**Settings Menu:**
```
⚙️ Team Settings

Configure your team preferences:
```

**Settings Updated:**
```
✅ Settings Updated

Team settings have been saved successfully.
```

## Validation Messages

**Invalid Username Format:**
```
❌ Invalid Format

Please use format: @username role

Example: @john_doe manager
```

**Invalid Role:**
```
❌ Invalid Role

Valid roles are:
• member - Basic team member
• manager - Can manage members  
• admin - Full team control

Example: @username member
```

**User Not Found:**
```
❌ User Not Found

@{username} was not found on Telegram.
Please check the username and try again.
```

**Permission Denied:**
```
❌ Permission Denied

You don't have permission for this action.

Current role: {user_role}
Required role: {required_role}
```

**Cannot Remove Self:**
```
❌ Cannot Remove Yourself

You are the only admin in this team.
Promote another member to admin first.
```

**Member Already Exists:**
```
❌ Member Already Added

@{username} is already a team member.
Use /team list to see all members.
```

## Error Messages

**Network Error:**
```
❌ Connection Error

Unable to process request. Please try again.
```

**Database Error:**
```
❌ System Error

Something went wrong. Please try again later.
If issue persists, contact support.
```

**Invalid Input:**
```
❌ Invalid Input

Please check your input and try again.
Use /help for command examples.
```

## Interactive Keyboards

**Main Team Menu:**
```javascript
{
  inline_keyboard: [
    [{ text: "👤 Add Member", callback_data: "team_add" }],
    [{ text: "📋 List Members", callback_data: "team_list" }],
    [{ text: "🗑️ Remove Member", callback_data: "team_remove" }],
    [{ text: "⚙️ Team Settings", callback_data: "team_settings" }]
  ]
}
```

**Role Selection:**
```javascript
{
  inline_keyboard: [
    [{ text: "👥 Member", callback_data: "team_role_member_{username}" }],
    [{ text: "👨‍💼 Manager", callback_data: "team_role_manager_{username}" }],
    [{ text: "👑 Admin", callback_data: "team_role_admin_{username}" }],
    [{ text: "❌ Cancel", callback_data: "team_cancel" }]
  ]
}
```

**Confirmation Dialog:**
```javascript
{
  inline_keyboard: [
    [{ text: "✅ Confirm", callback_data: "team_confirm_{action}_{username}" }],
    [{ text: "❌ Cancel", callback_data: "team_cancel" }]
  ]
}
```