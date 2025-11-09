/**
 * FreeTune Backend - Entry Point
 * Main server initialization with environment validation and service checks
 * Following MEMO.md specifications for ultra-performance music streaming
 */

import "dotenv/config";
import app from "./app.js";
import config from "./config/index.js";
import { logger } from "./utils/logger.js";
import { getSupabaseClient } from "./database/connections/supabase.js";
import { getRedisClient } from "./database/connections/redis.js";

// ---- Mongoose import ----
import {
  connectMongoose,
  getMongoose,
  closeMongooseConnection,
} from "./database/connections/mongodb.js";

// ============================================================================
// BANNER
// ============================================================================
const printBanner = () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              🎵 FreeTune Backend Server 🎵                     ║
║                                                                ║
║     Ultra-Performance Music Streaming Platform                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
};

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================
const validateEnvironment = () => {
  logger.info("🔍 Validating environment variables...");

  const requiredVars = [
    "NODE_ENV",
    "PORT",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "JWT_SECRET",
  ];

  const missingVars = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    logger.error("❌ Missing required environment variables:");
    missingVars.forEach(varName => {
      logger.error(`   - ${varName}`);
    });
    logger.error("\n💡 Please check your .env file");
    throw new Error("Environment validation failed");
  }

  // Warn about optional but recommended variables
  const optionalVars = [
    { name: "REDIS_URL", service: "Redis (caching)" },
    { name: "MONGODB_URI", service: "MongoDB (analytics)" },
    { name: "R2_ACCOUNT_ID", service: "Cloudflare R2 (storage)" },
  ];

  optionalVars.forEach(({ name, service }) => {
    if (!process.env[name]) {
      logger.warn(`⚠️  ${name} not set - ${service} disabled`);
    }
  });

  logger.info("✅ Environment variables validated");
};

// ============================================================================
// DATABASE CONNECTION CHECKS
// ============================================================================
const checkDatabaseConnections = async () => {
  logger.info("🔌 Checking database connections...");

  const connectionStatus = {
    supabase: false,
    redis: false,
    mongodb: false,
  };

  // Check Supabase (PostgreSQL)
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("songs")
      .select("count", { count: "exact", head: true });

    if (!error) {
      connectionStatus.supabase = true;
      logger.info("  ✅ Supabase (PostgreSQL) connected");
    } else {
      throw error;
    }
  } catch (error) {
    logger.error("  ❌ Supabase connection failed:", error.message);
    throw new Error("Supabase connection required for operation");
  }

  // Check Redis (Optional)
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      connectionStatus.redis = true;
      logger.info("  ✅ Redis (Upstash) connected");
    } else {
      logger.warn("  ⚠️  Redis not configured (caching disabled)");
    }
  } catch (error) {
    logger.warn(
      "  ⚠️  Redis connection failed (caching disabled):",
      error.message,
    );
  }

  // Check MongoDB (Mongoose) (Optional)
  try {
    const mongooseInstance = await connectMongoose();
    if (mongooseInstance && mongooseInstance.connection.readyState === 1) {
      connectionStatus.mongodb = true;
      logger.info("  ✅ MongoDB (Mongoose) connected");
    } else if (config.mongoose && config.mongoose.uri) {
      logger.error("  ❌ MongoDB (Mongoose) URI set but connection failed");
    } else {
      logger.warn("  ⚠️  MongoDB not configured (analytics disabled)");
    }
  } catch (error) {
    logger.warn(
      "  ⚠️  Mongoose connection failed (analytics disabled):",
      error.message,
    );
  }

  return connectionStatus;
};

// ============================================================================
// SERVICE STATUS CHECK
// ============================================================================
const checkServiceStatus = () => {
  logger.info("🔧 Checking service configurations...");

  // Check R2 Configuration
  if (
    config.r2.accountId &&
    config.r2.accessKeyId &&
    config.r2.secretAccessKey
  ) {
    logger.info("  ✅ Cloudflare R2 configured");
  } else {
    logger.warn(
      "  ⚠️  Cloudflare R2 not fully configured (file uploads disabled)",
    );
  }

  // Check JWT Configuration
  if (config.jwt.secret && config.jwt.secret.length >= 32) {
    logger.info("  ✅ JWT authentication configured");
  } else {
    logger.error("  ❌ JWT secret not configured or too short (min 32 chars)");
    throw new Error("JWT configuration required");
  }

  // Check CORS
  if (config.cors.allowedOrigins && config.cors.allowedOrigins.length > 0) {
    logger.info(
      `  ✅ CORS configured (${config.cors.allowedOrigins.length} origins)`,
    );
  } else {
    logger.warn("  ⚠️  CORS origins not configured (allowing all)");
  }

  logger.info("✅ Service configurations checked");
};

// ============================================================================
// SYSTEM INFO
// ============================================================================
const printSystemInfo = () => {
  logger.info("📊 System Information:");
  logger.info(`  • Node.js: ${process.version}`);
  logger.info(`  • Platform: ${process.platform}`);
  logger.info(`  • Architecture: ${process.arch}`);
  logger.info(
    `  • Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
  );
  logger.info(`  • Environment: ${config.env}`);
  logger.info(`  • Port: ${config.port}`);
};

// ============================================================================
// SERVER STARTUP
// ============================================================================
const startServer = async () => {
  try {
    // Print banner
    printBanner();

    // Step 1: Validate environment
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("STEP 1: Environment Validation");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    validateEnvironment();

    // Step 2: Check database connections
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("STEP 2: Database Connections");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const connectionStatus = await checkDatabaseConnections();

    // Step 3: Check service configurations
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("STEP 3: Service Configuration");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    checkServiceStatus();

    // Step 4: Print system info
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("STEP 4: System Information");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    printSystemInfo();

    // Step 5: Start HTTP server
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("STEP 5: Starting HTTP Server");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const PORT = config.port;
    const server = app.listen(PORT, () => {
      logger.info(`\n🚀 Server started successfully!`);
      logger.info(`\n📍 Endpoints:`);
      logger.info(`   • Health Check: http://localhost:${PORT}/health`);
      logger.info(`   • API Info:     http://localhost:${PORT}/api`);
      logger.info(`   • API Base:     http://localhost:${PORT}/api/*`);

      logger.info(`\n🔧 Services Status:`);
      logger.info(
        `   • Database:     ${connectionStatus.supabase ? "✅ Connected" : "❌ Disconnected"}`,
      );
      logger.info(
        `   • Cache:        ${connectionStatus.redis ? "✅ Connected" : "⚠️  Disabled"}`,
      );
      logger.info(
        `   • Analytics:    ${connectionStatus.mongodb ? "✅ Connected" : "⚠️  Disabled"}`,
      );

      logger.info(
        "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      );
      logger.info("✅ FreeTune Backend is ready to serve requests!");
      logger.info(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
      );
    });

    // Handle server errors
    server.on("error", error => {
      if (error.code === "EADDRINUSE") {
        logger.error(`❌ Port ${PORT} is already in use`);
        logger.error(
          "💡 Try killing the process: lsof -ti:" + PORT + " | xargs kill -9",
        );
      } else {
        logger.error("❌ Server error:", error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = async signal => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        // Close database connections
        try {
          await closeMongooseConnection();
        } catch (error) {
          logger.error("Error closing MongoDB (Mongoose):", error.message);
        }

        logger.info("Graceful shutdown completed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("❌ Failed to start server:", error.message);
    logger.error(error.stack);
    process.exit(1);
  }
};

// ============================================================================
// START THE APPLICATION
// ============================================================================
startServer();

export default app;
