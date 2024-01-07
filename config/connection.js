

const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

let database; // To store the reference to the connected database

module.exports = {
  connectToMongoDB: async () => {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
      database = client.db('phoneArena'); // Replace 'yourdatabase' with your actual database name
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  },

  getDatabase: () => {
    if (!database) {
      console.error('MongoDB connection not established.');
    }
    return database;
  },
};
