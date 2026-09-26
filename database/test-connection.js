const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, disconnectDB, mongoose } = require('./connection');
const models = require('./models');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('Target URI:', process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksense');

  try {
    const conn = await connectDB();
    console.log('✅ Connection test successful!');
    console.log(`Connected Database Name: ${conn.name}`);
    console.log(`Host: ${conn.host}:${conn.port}`);

    // Count records across all models
    console.log('\n--- Collection Record Counts ---');
    for (const [modelName, model] of Object.entries(models)) {
      const count = await model.countDocuments();
      console.log(`  • ${modelName}: ${count} documents`);
    }

    console.log('\nAll schemas and models loaded cleanly.');
  } catch (err) {
    console.error('❌ Connection test error:', err.message);
    console.log('\nNote: Ensure your MongoDB server is active (e.g. mongod or MongoDB Atlas URI in .env)');
  } finally {
    await disconnectDB();
  }
}

testConnection();
