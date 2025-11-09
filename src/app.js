import config from "./config/index.js";
import { errorHandler } from "./utils/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// Logging
if (config.env === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: message => logger.http(message.trim()),
      },
    }),
  );
}

// Rate limiting
app.use("/api", apiLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "FreeTune API v1",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      songs: "/api/songs",
      user: "/api/user",
      recommendations: "/api/recommendations",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.env} mode`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
});

export { app };
