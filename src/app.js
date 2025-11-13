/**
 * Express Application Setup
 * Configures all middleware, routes, and error handling
 * Following MEMO.md specifications for ultra-performance music streaming
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

import config from "./config/index.js";
import { errorHandler } from "./utils/apiError.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";
import ApiError from "./utils/apiError.js";
import { successResponse } from "./utils/apiResponse.js";
import { ENVIRONMENTS } from "./utils/constants.js";

// Initialize Express app
const app = express();

// ============================================================================
// TRUST PROXY (for deployment behind reverse proxy)
// ============================================================================
app.set("trust proxy", 1);

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ============================================================================
// CORS CONFIGURATION
// ============================================================================
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Per-Page"],
    maxAge: 86400, // 24 hours
  }),
);

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================================================
// COMPRESSION
// ============================================================================
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  }),
);

// ============================================================================
// REQUEST LOGGING
// ============================================================================
if (config.env === ENVIRONMENTS.DEVELOPMENT) {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: message => logger.http(message.trim()),
      },
      skip: (req, res) => res.statusCode < 400, // Only log errors in production
    }),
  );
}

// ============================================================================
// REQUEST ID (for tracking)
// ============================================================================
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader("X-Request-Id", req.id);
  next();
});

// ============================================================================
// RATE LIMITING
// ============================================================================
app.use("/api", apiLimiter);

// ============================================================================
// API ROUTES
// ============================================================================
import apiRouter from "./routes/index.js";

app.use("/api/v1", apiRouter);


// ============================================================================
// 404 HANDLER
// ============================================================================
app.use("*", (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN HANDLER
// ============================================================================
const gracefulShutdown = signal => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Close server
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================================================
// UNCAUGHT EXCEPTION HANDLER
// ============================================================================
process.on("uncaughtException", err => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  logger.error(err.name, err.message);
  logger.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", err => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...");
  logger.error(err);
  process.exit(1);
});

export default app;
