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
    origin: '*',
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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
app.use(`/api/v1/auth`, authLimiter, authRoutes);
app.use(`/api/v1/users`, userRoutes);
app.use(`/api/v1/properties`, propertyRoutes);
app.use(`/api/v1/bookings`, bookingRoutes);
app.use(`/api/v1/receipts`, receiptRoutes);
app.use(`/api/v1/reviews`, reviewRoutes);
app.use(`/api/v1/notifications`, notificationRoutes);
app.use(`/api/v1/admin`, adminRoutes);
app.use(`/api/v1/analytics`, analyticsRoutes);
app.use(`/api/v1/uploads`, uploadRoutes);
app.use(`/api/v1/search`, searchRoutes);
app.use(`/api/v1/dashboard`, dashboardRoutes);
app.use(`/api/v1/payments`, paymentRoutes);

// ===============================
// ERROR HANDLING
// ===============================
app.use(notFoundHandler);
app.use(errorHandler);

// ===============================
// SERVER STARTUP
// ===============================
const PORT = parseInt(process.env.PORT || "5050", 10);
const HOST = "0.0.0.0";

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("Database connected successfully");

    // Start server (updated with HOST)
    app.listen(PORT, HOST, () => {
      console.log(
        `${process.env.COMPANY_NAME} Server running on http://${HOST}:${PORT}`
      );
      console.log(`Environment: ${process.env.NODE_ENV}`);
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

// Start the server
startServer();

export default app;