import { MongoClient } from 'mongodb';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let mongoClient = null;
let db = null;

const getMongoClient = async () => {
  if (!mongoClient) {
    if (!config.mongodb.uri) {
      logger.warn('MongoDB URI not configured, analytics disabled');
      return null;
    }

    try {
      mongoClient = new MongoClient(config.mongodb.uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      await mongoClient.connect();
      db = mongoClient.db(config.mongodb.dbName);
      
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      mongoClient = null;
      db = null;
    }
  }

  return db;
};

const getCollection = async collectionName => {
  const database = await getMongoClient();
  if (!database) return null;
  return database.collection(collectionName);
};

const closeMongoConnection = async () => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
};

export { getMongoClient, getCollection, closeMongoConnection };
