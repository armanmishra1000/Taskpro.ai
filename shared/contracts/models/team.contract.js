// Team model contract
const { BaseModelContract } = require('./base.contract');

module.exports = {
  TeamContract: {
    // Extends BaseModelContract
    ...BaseModelContract,
    
    name: 'String',              // Team name, required, max 100 chars
    description: 'String',       // Team description, optional, max 500 chars
    createdBy: 'ObjectId',       // Creator user ID, required
    members: 'Array',            // Array of member objects
    settings: {
      allowMemberInvite: 'Boolean',   // Default true
      requireApproval: 'Boolean'      // Default false
    }
  }
}; 