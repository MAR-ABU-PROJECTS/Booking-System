"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const error_middleware_1 = require("./error.middleware");
const logger_middleware_1 = require("./logger.middleware");
/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
const notFoundHandler = (req, res, next) => {
    // Log the 404 attempt
    logger_middleware_1.logger.warn({
        type: '404_not_found',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString(),
    });
    // Create 404 error
    const error = new error_middleware_1.AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
    // Pass to error handler
    next(error);
};
exports.notFoundHandler = notFoundHandler;
