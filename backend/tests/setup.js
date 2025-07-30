// Jest setup file for backend tests
const mongoose = require('mongoose');

// Configure test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await mongoose.connect('mongodb://localhost:27017/taskpro_test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Global test teardown
afterAll(async () => {
  await mongoose.connection.close();
});

// Clean up database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Handle test errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 