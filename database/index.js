const { connectDB, disconnectDB, mongoose } = require('./connection');
const models = require('./models');
const stockService = require('./services/stockService');
const seedDatabase = require('./seeds/seed');
const referenceGenerator = require('./utils/referenceGenerator');

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
  ...models,
  models,
  stockService,
  seedDatabase,
  ...referenceGenerator,
  referenceGenerator,
};

