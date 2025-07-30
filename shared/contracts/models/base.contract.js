// Base fields for all models
module.exports = {
  BaseModelContract: {
    // MongoDB fields
    _id: 'ObjectId',           // NOT id, NOT userId
    createdAt: 'Date',         // NOT created_at, NOT dateCreated
    updatedAt: 'Date',         // NOT updated_at, NOT dateUpdated
    
    // Soft delete
    isDeleted: 'Boolean',      // NOT deleted, NOT is_deleted
    deletedAt: 'Date'          // NOT deleted_at
  }
}; 