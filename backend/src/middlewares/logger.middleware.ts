// MAR ABU PROJECTS SERVICES LLC - Minimal Logger Middleware
// This is a quick fix to get your server running immediately
import { Request, Response, NextFunction } from "express";
import * as winston from "winston";

// Configure winston logger with basic transports only
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Basic file transport (optional)
    new winston.transports.File({
      filename: "logs/app.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Separate audit logger with monthly rotation
const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: "logs/audit.log",
      maxsize: 10485760, // 10MB per file
      maxFiles: 31, // Keep ~1 month of files (will rotate based on size)
    }),
  ],
});

// Request logger middleware (simplified)
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

// Error logger middleware
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  next(err);
};

// Audit log function
export const auditLog = (
  action: string,
  userEmail: string,
  details: any,
  ip?: string
) => {
  const auditEntry = {
    action,
    userEmail,
    details,
    ip,
    timestamp: new Date().toISOString(),
  };

  // Log to both regular logger and dedicated audit logger
  logger.info("Audit", auditEntry);
  auditLogger.info("AUDIT_ENTRY", auditEntry);
};

// Export everything
export { logger };
export const stream = {
  write: (message: string) => logger.info(message.trim()),
};

export default {
  logger,
  requestLogger,
  errorLogger,
  auditLog,
  stream,
};
