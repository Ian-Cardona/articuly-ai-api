import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { LogContext } from '../types/middleware.type.ts';

function formatLog(level: string, message: string, context: LogContext): string {
  const { timestamp, method, path, userId, messageType, duration, error } = context;
  const parts = [
    `[${timestamp}]`,
    level,
    message,
  ];

  if (method && path) {
    parts.push(`${method} ${path}`);
  }

  if (userId) {
    parts.push(`user:${userId}`);
  }

  if (messageType) {
    parts.push(`type:${messageType}`);
  }

  if (duration !== undefined) {
    parts.push(`duration:${duration}ms`);
  }

  if (error) {
    parts.push(`error:${error}`);
  }

  return parts.join(' | ');
}

/**
 * HTTP request logging middleware
 */
export function httpRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(formatLog('INFO', 'HTTP Request Started', {
    timestamp,
    method: req.method,
    path: req.path,
  }));

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    const message = res.statusCode >= 400 ? 'HTTP Request Failed' : 'HTTP Request Completed';

    console.log(formatLog(level, message, {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      duration,
      error: res.statusCode >= 400 ? `Status: ${res.statusCode}` : undefined,
    }));
  });

  next();
}

/**
 * WebSocket connection logging
 */
export function websocketConnectionLogger(ws: AuthenticatedWebSocket): void {
  console.log(formatLog('INFO', 'WebSocket Connected', {
    timestamp: new Date().toISOString(),
    userId: ws.userId,
  }));
}

/**
 * WebSocket message logging
 */
export function websocketMessageLogger(ws: AuthenticatedWebSocket, messageType: string): void {
  console.log(formatLog('INFO', 'WebSocket Message Received', {
    timestamp: new Date().toISOString(),
    userId: ws.userId,
    messageType,
  }));
}

/**
 * WebSocket disconnection logging
 */
export function websocketDisconnectionLogger(ws: AuthenticatedWebSocket, code?: number, reason?: string): void {
  const error = code && code !== 1000 ? `Code: ${code}${reason ? `, Reason: ${reason}` : ''}` : undefined;

  console.log(formatLog('INFO', 'WebSocket Disconnected', {
    timestamp: new Date().toISOString(),
    userId: ws.userId,
    error,
  }));
}

/**
 * Error logging
 */
export function errorLogger(message: string, error: Error, context: Partial<LogContext> = {}): void {
  console.error(formatLog('ERROR', message, {
    timestamp: new Date().toISOString(),
    error: error.message,
    ...context,
  }));
}

/**
 * Info logging
 */
export function infoLogger(message: string, context: Partial<LogContext> = {}): void {
  console.log(formatLog('INFO', message, {
    timestamp: new Date().toISOString(),
    ...context,
  }));
}
