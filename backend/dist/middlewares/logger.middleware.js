"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.logger = exports.auditLog = exports.errorLogger = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
// Configure winston logger with basic transports only
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        // Console transport
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        // Basic file transport (optional)
        new winston_1.default.transports.File({
            filename: "logs/app.log",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
exports.logger = logger;
// Request logger middleware (simplified)
const requestLogger = (req, res, next) => {
    const start = Date.now();
    // Log request
    logger.info(`${req.method} ${req.url}`);
    // Log response
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
};
exports.requestLogger = requestLogger;
// Error logger middleware
const errorLogger = (err, req, res, next) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    next(err);
};
exports.errorLogger = errorLogger;
// Audit log function
const auditLog = (action, userId, details, ip) => {
    logger.info("Audit", { action, userId, details, ip });
};
exports.auditLog = auditLog;
exports.stream = {
    write: (message) => logger.info(message.trim()),
};
exports.default = {
    logger,
    requestLogger: exports.requestLogger,
    errorLogger: exports.errorLogger,
    auditLog: exports.auditLog,
    stream: exports.stream,
};
