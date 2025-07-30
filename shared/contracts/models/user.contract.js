// User model contract
module.exports = {
  UserContract: {
    // Extends BaseModelContract
    telegramId: 'String',      // NOT telegram_id, NOT tgId
    firstName: 'String',       // NOT first_name, NOT fname
    lastName: 'String',        // NOT last_name, NOT lname
    username: 'String',        // NOT user_name
    role: 'String',           // 'member' | 'manager' | 'admin'
    isActive: 'Boolean',      // NOT active, NOT is_active
    settings: {
      timezone: 'String',
      notifications: 'Boolean'
    }
  }
}; 