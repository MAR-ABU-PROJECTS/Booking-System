"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.logger = exports.auditLog = exports.errorLogger = exports.requestLogger = void 0;
const winston = __importStar(require("winston"));
// Configure winston logger with basic transports only
const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        // Basic file transport (optional)
        new winston.transports.File({
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
