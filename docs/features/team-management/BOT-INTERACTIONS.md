# Team Management Bot Interactions

## User Flow:
1. User types `/team` or clicks team button
2. Bot shows team management menu with options
3. User selects action (Add/List/Remove members)
4. Bot guides through specific workflow
5. Bot confirms action and updates team

## Messages:

### Command: /team
**Bot Response:**
```
👥 Team Management

Choose an action:
```
**Keyboard:**
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

### Add Member Flow:
**Bot Response after "Add Member":**
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

**After Valid Input:**
```
✅ Team Member Added!

👤 @john_doe
🏷️ Role: Manager
📅 Added: Dec 27, 2024

Total team members: 5
```

### List Members Flow:
**Bot Response:**
```
📋 Team Members (5)

👑 **Admins:**
• @admin_user (You)

👨‍💼 **Managers:**
• @john_doe
• @jane_manager

👥 **Members:**
• @alice_dev
• @bob_tester

Use /team remove to remove members
```

### Remove Member Flow:
**Bot Response after "Remove Member":**
```
🗑️ Remove Team Member

Select member to remove:
```
**Keyboard with member list:**
```javascript
{
  inline_keyboard: [
    [{ text: "👥 @alice_dev (Member)", callback_data: "team_remove_alice_dev" }],
    [{ text: "👨‍💼 @john_doe (Manager)", callback_data: "team_remove_john_doe" }],
    [{ text: "❌ Cancel", callback_data: "team_cancel" }]
  ]
}
```

**Confirmation Dialog:**
```
⚠️ Confirm Removal

Remove @john_doe (Manager) from team?
This cannot be undone.
```

## Callback Handlers:
- `team_add`: Start add member workflow
- `team_list`: Show all team members  
- `team_remove`: Show removal interface
- `team_settings`: Team configuration options
- `team_remove_{username}`: Remove specific member
- `team_confirm_remove_{username}`: Confirm removal
- `team_cancel`: Cancel current operation
- `team_role_{role}_{username}`: Assign role to member