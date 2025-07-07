// Error codes for consistent error handling
export enum ErrorCode {
  // WebSocket errors
  WEBSOCKET_INVALID_MESSAGE = 'WEBSOCKET_INVALID_MESSAGE',
  WEBSOCKET_AUTH_FAILED = 'WEBSOCKET_AUTH_FAILED',
  WEBSOCKET_USER_NOT_FOUND = 'WEBSOCKET_USER_NOT_FOUND',

  // Audio stream errors
  AUDIO_STREAM_NOT_STARTED = 'AUDIO_STREAM_NOT_STARTED',
  AUDIO_STREAM_ALREADY_ACTIVE = 'AUDIO_STREAM_ALREADY_ACTIVE',
  AUDIO_DATA_INVALID = 'AUDIO_DATA_INVALID',
  AUDIO_DATA_EMPTY = 'AUDIO_DATA_EMPTY',

  // Azure Speech errors
  AZURE_NOT_READY = 'AZURE_NOT_READY',
  AZURE_CONNECTION_FAILED = 'AZURE_CONNECTION_FAILED',
  AZURE_RECOGNITION_FAILED = 'AZURE_RECOGNITION_FAILED',
  AZURE_NO_SPEECH_MATCH = 'AZURE_NO_SPEECH_MATCH',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_JSON_FORMAT = 'INVALID_JSON_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // General errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Structured error response
export interface ErrorResponse {
  type: 'ERROR';
  payload: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  };
}

// Error factory functions
export const createErrorResponse = (
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse => ({
  type: 'ERROR',
  payload: {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  },
});

// Common error responses
export const errorResponses = {
  invalidMessage: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.WEBSOCKET_INVALID_MESSAGE, 'Invalid message format', details),

  authFailed: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.WEBSOCKET_AUTH_FAILED, 'Authentication failed', details),

  streamNotStarted: () =>
    createErrorResponse(ErrorCode.AUDIO_STREAM_NOT_STARTED, 'Audio stream not initialized or missing context'),

  azureNotReady: () =>
    createErrorResponse(ErrorCode.AZURE_NOT_READY, 'Azure AI Speech connection not established or stream not ready'),

  audioDataInvalid: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.AUDIO_DATA_INVALID, 'Invalid audio data format', details),

  internalError: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', details),
};
