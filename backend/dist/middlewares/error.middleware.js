"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const winston_1 = __importDefault(require("winston"));
// Create logger
const logger = winston_1.default.createLogger({
    level: "error",
    format: winston_1.default.format.json(),
    transports: [
        new winston_1.default.transports.File({ filename: "error.log", level: "error" }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
// Custom error class
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Error handler middleware
const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = err.message || "Internal server error";
    let errors = null;
    let errorType = err.constructor.name;
    // Log error for debugging
    logger.error({
        error: err.message,
        type: errorType,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
    });
    // Handle different error types
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errors = err.code ? { code: err.code } : null;
    }
    else if (err instanceof zod_1.ZodError) {
        statusCode = 400;
        message = "Validation error";
        errors = err.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
        }));
    }
    else if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        statusCode = 400;
        switch (err.code) {
            case "P2002":
                // Unique constraint violation
                const field = Array.isArray(err.meta?.target)
                    ? err.meta?.target[0]
                    : err.meta?.target;
                // Customize message based on field
                switch (field) {
                    case "email":
                        message = "This email address is already registered";
                        break;
                    case "phone":
                        message = "This phone number is already registered";
                        break;
                    default:
                        message = `This ${field} is already taken`;
                }
                errors = {
                    field: field,
                    code: err.code,
                    type: "UniqueConstraintViolation",
                };
                break;
            case "P2025":
                // Record not found
                statusCode = 404;
                message = "Record not found";
                errors = {
                    code: err.code,
                    type: "RecordNotFound",
                    details: err.meta,
                };
                break;
            case "P2003":
                // Foreign key constraint violation
                message = "Referenced record does not exist";
                errors = {
                    field: err.meta?.field_name,
                    code: err.code,
                    type: "ForeignKeyViolation",
                };
                break;
            case "P2014":
                message = "Invalid data relationship";
                errors = {
                    code: err.code,
                    type: "InvalidRelation",
                    details: err.meta,
                };
                break;
            default:
                message = err.message || "Database operation failed";
                errors = {
                    code: err.code,
                    type: "DatabaseError",
                    details: process.env.NODE_ENV === "development" ? err.meta : undefined,
                };
        }
    }
    else if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = "Invalid data provided";
        errors = {
            type: "ValidationError",
            details: err.message.split("\n"),
        };
    }
    // Handle JWT errors
    else if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token";
        errors = {
            type: "AuthenticationError",
            code: "INVALID_TOKEN",
        };
    }
    else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired";
        errors = {
            type: "AuthenticationError",
            code: "TOKEN_EXPIRED",
        };
    }
    // Handle authentication errors
    else if (err.message?.includes("Invalid credentials")) {
        statusCode = 401;
        message = "Invalid email or password";
        errors = {
            type: "AuthenticationError",
            code: "INVALID_CREDENTIALS",
        };
    }
    else if (err.message?.includes("Email not verified")) {
        statusCode = 403;
        message = "Please verify your email address first";
        errors = {
            type: "AuthenticationError",
            code: "EMAIL_NOT_VERIFIED",
        };
    }
    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        errors,
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
            type: errorType,
        }),
    });
};
exports.errorHandler = errorHandler;
// Not found handler
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404, "NOT_FOUND");
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
