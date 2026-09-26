const { connectDB, mongoose } = require('../../database/connection');

module.exports = connectDB;
module.exports.mongoose = mongoose;
