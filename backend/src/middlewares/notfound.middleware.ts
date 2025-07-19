// MAR ABU PROJECTS SERVICES LLC - Not Found Middleware
import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware'
import { logger } from './logger.middleware'

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  // Log the 404 attempt
  logger.warn({
    type: '404_not_found',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  })

  // Create 404 error
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  )

  // Pass to error handler
  next(error)
}