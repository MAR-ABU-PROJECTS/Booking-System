// MAR ABU PROJECTS SERVICES LLC - Server Configuration
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { swaggerSpec, swaggerUi } from "./swagger";
import cron from "node-cron";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import propertyRoutes from "./routes/property.routes";
import bookingRoutes from "./routes/booking.routes";
import receiptRoutes from "./routes/receipt.routes";
import reviewRoutes from "./routes/review.routes";
import notificationRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import analyticsRoutes from "./routes/analytics.routes";
import uploadRoutes from "./routes/upload.routes";
import searchRoutes from "./routes/search.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import paymentRoutes from "./routes/payment.routes";

// Import middleware
import { errorHandler } from "./middlewares/error.middleware";
import { notFoundHandler } from "./middlewares/notfound.middleware";
import { requestLogger } from "./middlewares/logger.middleware";

// Initialize Prisma
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Create Express app
const app = express();

// Trust proxy (for production behind reverse proxy)
app.set("trust proxy", 1);

// Swagger implementation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===============================
// MIDDLEWARE CONFIGURATION
// ===============================

// Security middleware
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
  })
);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5050",
      "https://booking-system-n26e.onrender.com",
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(
      (origin): origin is string =>
        typeof origin === "string" && origin.length > 0
    ),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Custom request logger
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

// Static files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ===============================
// API ROUTES
// ===============================
const API_PREFIX = process.env.API_PREFIX || "/api/v1";

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    company: process.env.COMPANY_NAME,
  });
});

// API routes
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/properties`, propertyRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/receipts`, receiptRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/uploads`, uploadRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/payment`, paymentRoutes);

// ===============================
// ERROR HANDLING
// ===============================
app.use(notFoundHandler);
app.use(errorHandler);

// ===============================
// SERVER STARTUP
// ===============================
const PORT = process.env.PORT || "5050";

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("Database connected successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`${process.env.COMPANY_NAME} Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Primary Color: ${process.env.PRIMARY_COLOR}`);
      console.log(`Secondary Color: ${process.env.SECONDARY_COLOR}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Periodic cleanup of expired blacklisted tokens (runs daily at 3 AM)
cron.schedule("0 3 * * *", async () => {
  try {
    const result = await prisma.blacklistedToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired blacklisted tokens`);
    }
  } catch (err) {
    console.error("Error cleaning blacklisted tokens:", err);
  }
});

// Periodic cleanup of expired refresh tokens (runs daily at 3 AM)
cron.schedule("0 3 * * *", async () => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    });
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired/revoked refresh tokens`);
    }
  } catch (err) {
    console.error("Error cleaning refresh tokens:", err);
  }
});

// Start the server
startServer();

export default app;
