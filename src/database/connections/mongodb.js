import mongoose from "mongoose";
import config from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let isConnected = false;

/**
 * Initializes and returns the singleton Mongoose connection instance.
 * Logs warnings on missing configuration or errors.
 */
const connectMongoose = async () => {
  if (!config.mongodb.uri) {
    logger.warn("MongoDB URI not configured, analytics disabled");
    return null;
  }

  if (isConnected) {
    return mongoose;
  }

  try {
    // Use config.mongodb.dbName if available, otherwise let URI define the default DB
    // i have commented the depreceated code which is no longer
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      // dbName: config.mongodb.dbName,
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    };

    await mongoose.connect(config.mongodb.uri, options);

    isConnected = true;
    logger.info("Mongoose (MongoDB) connected successfully");
    return mongoose;
  } catch (error) {
    logger.error("Mongoose connection error:", error);
    isConnected = false;
    return null;
  }
};

/**
 * Returns the current Mongoose connection instance, or attempts to connect if not already connected.
 */
const getMongoose = async () => {
  if (!isConnected) {
    await connectMongoose();
  }
  return mongoose;
};

/**
 * Retrieves a Mongoose model for a given collection name and schema.
 * If the model already exists in Mongoose's models cache, returns it directly.
 *
 * @param {string} name - The model name or collection identifier.
 * @param {mongoose.Schema} schema - The Mongoose Schema to use (strongly recommended).
 * @return {mongoose.Model} The mongoose model instance.
 */
const getMongooseModel = (name, schema) => {
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  return mongoose.model(name, schema);
};

/**
 * Gracefully closes the Mongoose connection.
 */
const closeMongooseConnection = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("Mongoose (MongoDB) connection closed");
  }
};

export {
  connectMongoose,
  getMongoose,
  getMongooseModel,
  closeMongooseConnection,
};

/**
 * --------------------------------------------------------------------------
 * MongoDB vs. Mongoose: Detailed Explanation
 * --------------------------------------------------------------------------
 *
 * - MongoDB:
 *   - MongoDB is a popular open-source NoSQL database that stores data in a flexible, JSON-like format called BSON.
 *   - The official "mongodb" Node.js driver (@see: https://www.npmjs.com/package/mongodb) provides low-level access to the MongoDB database.
 *   - Using the MongoDB driver, you interact directly with database connections, collections, and perform CRUD operations with plain JavaScript objects.
 *   - You manage schemas, validation, and business logic in your own application code or at the database level via MongoDB commands.
 *
 * - Mongoose:
 *   - Mongoose (https://mongoosejs.com/) is an Object Data Modeling (ODM) library for Node.js and MongoDB.
 *   - Mongoose builds on top of the official MongoDB driver, providing a higher-level abstraction and features such as:
 *     - Schemas and data models: Define explicit structure and data validation for your collections.
 *     - Middleware: Run custom logic before/after certain database operations (e.g., 'pre-save', 'post-remove').
 *     - Built-in type casting, data validation, query building, and rich plugin ecosystem.
 *   - With Mongoose, you interact with your data via JavaScript classes ("models"), which makes application logic more robust and manageable.
 *
 * - Differences:
 *   - "mongodb" driver is low-level, general-purpose, and schema-less (flexible). You must manually manage structure and validation.
 *   - "mongoose" is high-level, enforces schemas, helps prevent bad data, provides middleware/hooks, and is better suited for complex applications with business logic needs.
 *   - Both ultimately communicate with a MongoDB database, but Mongoose improves developer ergonomics and code maintainability.
 *
 * - Are they the same?
 *   - No, Mongoose is a library that uses the MongoDB driver under the hood, but adds abstraction, features, and structure.
 *   - For quick scripts or full control, use the "mongodb" driver. For robust apps, safe data, and easier development, use Mongoose.
 *
 * --------------------------------------------------------------------------
 */
