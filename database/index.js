const { connectDB, disconnectDB, mongoose } = require('./connection');
const models = require('./models');
const stockService = require('./services/stockService');
const seedDatabase = require('./seeds/seed');

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
  ...models,
  models,
  stockService,
  seedDatabase,
};
