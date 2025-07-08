import { validateWebSocketMessage } from '../validations/websocket.validation.ts';
import { handleWebSocketMessage } from '../controllers/websocket.controller.ts';
import { handleWebSocketClose, handleWebSocketError } from '../controllers/websocket.controller.ts';
import { createAuthSuccessResponse } from '../utils/response.utils.ts';

import { authenticateConnection, isAuthenticated } from './auth.middleware.ts';
import { checkRateLimits, initializeConnection, cleanupConnection } from './rate-limit.middleware.ts';
import { websocketConnectionLogger, websocketMessageLogger, websocketDisconnectionLogger } from './logging.middleware.ts';
import { websocketErrorHandler, websocketAuthErrorHandler, websocketRateLimitErrorHandler } from './error.middleware.ts';

import type { AuthStateWebSocket } from '../types/middleware.type.ts';
import type { ValidationResult } from '../types/validation.type.ts';

/**
 * Initialize middleware for a new WebSocket connection
 */
export function initializeWebSocketMiddleware(ws: AuthStateWebSocket): void {
  initializeConnection(ws);
  websocketConnectionLogger(ws);
}

/**
 * Handle WebSocket message with middleware chain
 */
export async function handleWebSocketMessageWithMiddleware(ws: AuthStateWebSocket, data: Buffer): Promise<void> {
  try {
    // Check if authenticated
    if (!isAuthenticated(ws)) {
      const authResult = await authenticateConnection(ws, data);
      if (!authResult.success) {
        websocketAuthErrorHandler(ws, authResult.error ?? 'Authentication failed');
        return;
      }
      // Send authentication success response
      if (ws.userId) {
        ws.send(JSON.stringify(createAuthSuccessResponse(ws.userId)));
      }
      return; // Authentication successful, wait for next message
    }

    // Parse and validate message
    const message = data.toString('utf-8');
    const validationResult: ValidationResult = validateWebSocketMessage(message);

    if (!validationResult.isValid) {
      websocketErrorHandler(ws, new Error(validationResult.errors[0] ?? 'Invalid message format'));
      return;
    }

    // Check rate limits
    const rateLimitResult = checkRateLimits(ws, message);
    if (!rateLimitResult.allowed) {
      websocketRateLimitErrorHandler(ws, rateLimitResult.error ?? 'Rate limit exceeded');
      return;
    }

    // Log message
    const parsedMessage = JSON.parse(message) as { type: string };
    websocketMessageLogger(ws, parsedMessage.type);

    // Handle message
    await handleWebSocketMessage(ws, message);
  } catch (error) {
    websocketErrorHandler(ws, error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Handle WebSocket close with cleanup
 */
export function handleWebSocketCloseWithMiddleware(ws: AuthStateWebSocket, code?: number, reason?: string): void {
  cleanupConnection(ws);
  websocketDisconnectionLogger(ws, code, reason);
  handleWebSocketClose(ws);
}

/**
 * Handle WebSocket error with logging
 */
export function handleWebSocketErrorWithMiddleware(ws: AuthStateWebSocket, error: Error): void {
  websocketErrorHandler(ws, error);
  handleWebSocketError(ws, error);
}
