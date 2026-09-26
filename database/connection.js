const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksense';

let isConnected = false;

const connectDB = async (customUri = null) => {
  const uri = customUri || MONGODB_URI;

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.name} @ ${conn.connection.host}`);
    return conn.connection;
  } catch (err) {
    console.error(`[MongoDB] Connection Failed: ${err.message}`);
    throw err;
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Disconnected from database.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Runtime error: ${err.message}`);
});

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Connection closed.');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
};
