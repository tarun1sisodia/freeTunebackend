import mongoose from 'mongoose';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let isConnected = false;

const getMongooseConnection = async () => {
  if (!isConnected) {
    if (!config.mongodb.uri) {
      logger.warn('MongoDB URI not configured, analytics disabled');
      return null;
    }

    try {
      await mongoose.connect(config.mongodb.uri, {
        dbName: config.mongodb.dbName,
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      isConnected = true;
      logger.info('Mongoose connected successfully');
    } catch (error) {
      logger.error('Mongoose connection error:', error);
      isConnected = false;
      return null;
    }
  }

  return mongoose.connection;
};

const getCollection = async collectionName => {
  const connection = await getMongooseConnection();
  if (!connection) return null;
  return mongoose.connection.db.collection(collectionName);
};

const closeMongoConnection = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Mongoose connection closed');
  }
};

export { getMongooseConnection, getCollection, closeMongoConnection };
