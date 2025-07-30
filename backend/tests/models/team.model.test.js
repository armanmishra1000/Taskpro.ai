const mongoose = require('mongoose');
const Team = require('../../src/models/team.model');

describe('Team Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/taskpro_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Team.deleteMany({});
  });

  test('should create team with valid data', async () => {
    const teamData = {
      name: 'Test Team',
      description: 'Test Description',
      createdBy: new mongoose.Types.ObjectId(),
      members: [{
        userId: new mongoose.Types.ObjectId(),
        username: 'testuser',
        role: 'admin',
        addedBy: new mongoose.Types.ObjectId(),
        addedAt: new Date()
      }]
    };

    const team = new Team(teamData);
    const savedTeam = await team.save();

    expect(savedTeam.name).toBe('Test Team');
    expect(savedTeam.members).toHaveLength(1);
    expect(savedTeam.members[0].role).toBe('admin');
  });

  test('should require name field', async () => {
    const team = new Team({
      createdBy: new mongoose.Types.ObjectId()
    });

    await expect(team.save()).rejects.toThrow();
  });

  test('should validate member role enum', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId(),
      members: [{
        userId: new mongoose.Types.ObjectId(),
        username: 'testuser',
        role: 'invalidrole',
        addedBy: new mongoose.Types.ObjectId()
      }]
    });

    await expect(team.save()).rejects.toThrow();
  });

  test('should update timestamp on save', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId()
    });

    const savedTeam = await team.save();
    const originalUpdatedAt = savedTeam.updatedAt;

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 10));
    savedTeam.description = 'Updated description';
    await savedTeam.save();

    expect(savedTeam.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  test('should enforce name length limit', async () => {
    const team = new Team({
      name: 'A'.repeat(101), // Exceeds 100 char limit
      createdBy: new mongoose.Types.ObjectId()
    });

    await expect(team.save()).rejects.toThrow();
  });

  test('should enforce description length limit', async () => {
    const team = new Team({
      name: 'Test Team',
      description: 'A'.repeat(501), // Exceeds 500 char limit
      createdBy: new mongoose.Types.ObjectId()
    });

    await expect(team.save()).rejects.toThrow();
  });

  test('should accept valid member roles', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId(),
      members: [
        {
          userId: new mongoose.Types.ObjectId(),
          username: 'admin1',
          role: 'admin',
          addedBy: new mongoose.Types.ObjectId()
        },
        {
          userId: new mongoose.Types.ObjectId(),
          username: 'manager1',
          role: 'manager',
          addedBy: new mongoose.Types.ObjectId()
        },
        {
          userId: new mongoose.Types.ObjectId(),
          username: 'member1',
          role: 'member',
          addedBy: new mongoose.Types.ObjectId()
        }
      ]
    });

    const savedTeam = await team.save();
    expect(savedTeam.members).toHaveLength(3);
    expect(savedTeam.members[0].role).toBe('admin');
    expect(savedTeam.members[1].role).toBe('manager');
    expect(savedTeam.members[2].role).toBe('member');
  });

  test('should set default settings', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId()
    });

    const savedTeam = await team.save();
    expect(savedTeam.settings.allowMemberInvite).toBe(true);
    expect(savedTeam.settings.requireApproval).toBe(false);
  });

  test('should handle soft delete', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId()
    });

    const savedTeam = await team.save();
    expect(savedTeam.isDeleted).toBe(false);
    expect(savedTeam.deletedAt).toBeUndefined();

    // Soft delete
    savedTeam.isDeleted = true;
    savedTeam.deletedAt = new Date();
    await savedTeam.save();

    expect(savedTeam.isDeleted).toBe(true);
    expect(savedTeam.deletedAt).toBeDefined();
  });

  test('should create indexes for performance', async () => {
    const indexes = await Team.collection.indexes();
    const indexNames = indexes.map(index => Object.keys(index.key)[0]);
    
    expect(indexNames).toContain('createdBy');
    expect(indexNames).toContain('members.userId');
    expect(indexNames).toContain('isDeleted');
  });
}); 