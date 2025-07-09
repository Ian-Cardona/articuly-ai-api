
// eslint-disable-next-line import/no-extraneous-dependencies
import winston from 'winston';

import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { LogContext } from '../types/middleware.type.ts';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'articuly-ai-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      }),
    ),
  }));
}

export function httpRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  logger.info('HTTP Request Started', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    const message = res.statusCode >= 400 ? 'HTTP Request Failed' : 'HTTP Request Completed';

    logger.log(level, message, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    });
  });

  next();
}

export function websocketConnectionLogger(ws: AuthenticatedWebSocket): void {
  logger.info('WebSocket Connected', {
    userId: ws.userId,
  });
}

export function websocketMessageLogger(ws: AuthenticatedWebSocket, messageType: string): void {
  logger.info('WebSocket Message Received', {
    userId: ws.userId,
    messageType,
  });
}

export function websocketDisconnectionLogger(ws: AuthenticatedWebSocket, code?: number, reason?: string): void {
  const logData: { userId?: string; error?: string } = {
    userId: ws.userId,
  };

  if (code && code !== 1000) {
    logData.error = `Code: ${code}${reason ? `, Reason: ${reason}` : ''}`;
  }

  logger.info('WebSocket Disconnected', logData);
}

export function errorLogger(message: string, error: Error, context: Partial<LogContext> = {}): void {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

export function infoLogger(message: string, context: Partial<LogContext> = {}): void {
  logger.info(message, context);
}

export default logger;
