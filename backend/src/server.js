"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// MAR ABU PROJECTS SERVICES LLC - Server Configuration
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const swagger_1 = require("./swagger");
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const property_routes_1 = __importDefault(require("./routes/property.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const receipt_routes_1 = __importDefault(require("./routes/receipt.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
// Import middleware
const error_middleware_1 = require("./middlewares/error.middleware");
const notfound_middleware_1 = require("./middlewares/notfound.middleware");
const logger_middleware_1 = require("./middlewares/logger.middleware");
// Initialize Prisma
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
});
// Create Express app
const app = (0, express_1.default)();
// Trust proxy (for production behind reverse proxy)
app.set("trust proxy", 1);
// Swagger implementation
app.use("/api-docs", swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.swaggerSpec));
// ===============================
// MIDDLEWARE CONFIGURATION
// ===============================
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        process.env.ADMIN_URL || "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Compression middleware
app.use((0, compression_1.default)());
// Logging middleware
if (process.env.NODE_ENV === "development") {
    app.use((0, morgan_1.default)("dev"));
}
else {
    app.use((0, morgan_1.default)("combined"));
}
// Custom request logger
app.use(logger_middleware_1.requestLogger);
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply rate limiting to API routes
app.use("/api/", limiter);
// Stricter rate limiting for auth routes
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: "Too many authentication attempts, please try again later.",
    skipSuccessfulRequests: true,
});
// Static files
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
// ===============================
// API ROUTES
// ===============================
// const API_PREFIX = process.env.API_PREFIX || '/api/v1'
app.use("/api-docs", swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.swaggerSpec));
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
app.use(`/api/v1/auth`, authLimiter, auth_routes_1.default);
app.use(`/api/v1/users`, user_routes_1.default);
app.use(`/api/v1/properties`, property_routes_1.default);
app.use(`/api/v1/bookings`, booking_routes_1.default);
app.use(`/api/v1/receipts`, receipt_routes_1.default);
app.use(`/api/v1/reviews`, review_routes_1.default);
app.use(`/api/v1/notifications`, notification_routes_1.default);
app.use(`/api/v1/admin`, admin_routes_1.default);
app.use(`/api/v1/analytics`, analytics_routes_1.default);
// ===============================
// ERROR HANDLING
// ===============================
app.use(notfound_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// ===============================
// SERVER STARTUP
// ===============================
const PORT = process.env.PORT || "5001";
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Test database connection
        yield exports.prisma.$connect();
        console.log("Database connected successfully");
        // Start server
        app.listen(PORT, () => {
            console.log(`${process.env.COMPANY_NAME} Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Primary Color: ${process.env.PRIMARY_COLOR}`);
            console.log(`Secondary Color: ${process.env.SECONDARY_COLOR}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
});
// Graceful shutdown
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGTERM received, shutting down gracefully...");
    yield exports.prisma.$disconnect();
    process.exit(0);
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGINT received, shutting down gracefully...");
    yield exports.prisma.$disconnect();
    process.exit(0);
}));
// Start the server
startServer();
exports.default = app;
