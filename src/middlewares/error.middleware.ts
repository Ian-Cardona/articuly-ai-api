
import { errorResponses } from '../types/error.type.ts';

import { errorLogger } from './logging.middleware.ts';

import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { ErrorWithCode } from '../types/middleware.type.ts';

/**
 * HTTP error handling middleware
 */
export function httpErrorHandler(error: ErrorWithCode, req: Request, res: Response, _next: NextFunction): void {
  errorLogger('HTTP Error', error, {
    method: req.method,
    path: req.path,
  });

  const statusCode = error.statusCode ?? 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    statusCode: 404,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

/**
 * WebSocket error handler
 */
export function websocketErrorHandler(ws: AuthenticatedWebSocket, error: Error): void {
  errorLogger('WebSocket Error', error, {
    userId: ws.userId,
  });

  const errorResponse = errorResponses.internalError({
    operation: 'websocket_error',
    errorDetails: error.message,
  });
  ws.send(JSON.stringify(errorResponse));
}

/**
 * WebSocket authentication error handler
 */
export function websocketAuthErrorHandler(ws: AuthenticatedWebSocket, error: string): void {
  errorLogger('WebSocket Auth Error', new Error(error), {
    userId: ws.userId,
  });

  const errorResponse = errorResponses.unauthorized();
  ws.send(JSON.stringify(errorResponse));
}

/**
 * WebSocket rate limit error handler
 */
export function websocketRateLimitErrorHandler(ws: AuthenticatedWebSocket, error: string): void {
  errorLogger('WebSocket Rate Limit Error', new Error(error), {
    userId: ws.userId,
  });

  const errorResponse = errorResponses.internalError({
    operation: 'rate_limit_violation',
    errorDetails: error,
  });
  ws.send(JSON.stringify(errorResponse));
}
