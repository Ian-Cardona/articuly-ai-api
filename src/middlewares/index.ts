// Auth middleware
export {
  authenticateConnection,
  isAuthenticated,
  requireAuth,
} from './auth.middleware.ts';

// Error middleware
export {
  httpErrorHandler,
  notFoundHandler,
  websocketErrorHandler,
  websocketAuthErrorHandler,
  websocketRateLimitErrorHandler,
} from './error.middleware.ts';

// Logging middleware
export {
  httpRequestLogger,
  websocketConnectionLogger,
  websocketMessageLogger,
  websocketDisconnectionLogger,
  errorLogger,
  infoLogger,
} from './logging.middleware.ts';

// Rate limit middleware
export {
  initializeConnection,
  cleanupConnection,
  checkMessageRateLimit,
  checkAudioDataRateLimit,
  checkRateLimits,
} from './rate-limit.middleware.ts';

// WebSocket middleware
export {
  initializeWebSocketMiddleware,
  handleWebSocketMessageWithMiddleware,
  handleWebSocketCloseWithMiddleware,
  handleWebSocketErrorWithMiddleware,
} from './websocket.middleware.ts';
