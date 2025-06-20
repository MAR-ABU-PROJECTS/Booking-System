// MAR ABU PROJECTS SERVICES LLC - Logger Middleware
import { Request, Response, NextFunction } from 'express'
import winston from 'winston'
import 'winston-daily-rotate-file'

// Configure winston logger
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Create transports
const transports = []

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  )
}

// File transport for all environments
transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
  })
)

// Error file transport
transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: logFormat,
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports,
})

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  // Log request
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer'),
  })

  // Log response
  const originalSend = res.send
  res.send = function (data) {
    res.send = originalSend
    const responseTime = Date.now() - start

    logger.info({
      type: 'response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length'),
    })

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn({
        type: 'slow-request',
        method: req.method,
        url: req.url,
        responseTime: `${responseTime}ms`,
      })
    }

    return res.send(data)
  }

  next()
}

// Audit log function
export const auditLog = (
  action: string,
  userId: string,
  details: any,
  ip?: string
) => {
  logger.info({
    type: 'audit',
    action,
    userId,
    details,
    ip,
    timestamp: new Date().toISOString(),
  })
}