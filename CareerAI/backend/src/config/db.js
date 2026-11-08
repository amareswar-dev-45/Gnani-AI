const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 100,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: true
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host} / DB: ${conn.connection.name} (Pool: 10-100)`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Warning]: Database connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Info]: Database connection re-established.');
});

module.exports = connectDB;
