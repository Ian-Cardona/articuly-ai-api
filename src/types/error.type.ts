import { ERROR_MESSAGES } from '../constants/error.constant.ts';

export enum ErrorCode {
  // WebSocket errors
  WEBSOCKET_INVALID_MESSAGE = 'WEBSOCKET_INVALID_MESSAGE',
  WEBSOCKET_AUTH_FAILED = 'WEBSOCKET_AUTH_FAILED',
  WEBSOCKET_USER_NOT_FOUND = 'WEBSOCKET_USER_NOT_FOUND',
  WEBSOCKET_UNAUTHORIZED = 'WEBSOCKET_UNAUTHORIZED',
  WEBSOCKET_INVALID_PAYLOAD = 'WEBSOCKET_INVALID_PAYLOAD',
  WEBSOCKET_UNSUPPORTED_MESSAGE_TYPE = 'WEBSOCKET_UNSUPPORTED_MESSAGE_TYPE',

  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_NOT_ACTIVE = 'SESSION_NOT_ACTIVE',
  SESSION_ALREADY_ACTIVE = 'SESSION_ALREADY_ACTIVE',

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

export interface ErrorResponse {
  type: 'ERROR';
  payload: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  };
}

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

export const errorResponses = {
  invalidMessage: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.WEBSOCKET_INVALID_MESSAGE, ERROR_MESSAGES.INVALID_MESSAGE_FORMAT, details),

  authFailed: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.WEBSOCKET_AUTH_FAILED, ERROR_MESSAGES.AUTHENTICATION_FAILED, details),

  unauthorized: () =>
    createErrorResponse(ErrorCode.WEBSOCKET_UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED_ACCESS),

  invalidPayload: () =>
    createErrorResponse(ErrorCode.WEBSOCKET_INVALID_PAYLOAD, ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT),

  unsupportedMessageType: (messageType: string) =>
    createErrorResponse(ErrorCode.WEBSOCKET_UNSUPPORTED_MESSAGE_TYPE, ERROR_MESSAGES.UNSUPPORTED_MESSAGE_TYPE(messageType)),

  sessionNotFound: () =>
    createErrorResponse(ErrorCode.SESSION_NOT_FOUND, ERROR_MESSAGES.SESSION_NOT_FOUND),

  sessionNotActive: () =>
    createErrorResponse(ErrorCode.SESSION_NOT_ACTIVE, ERROR_MESSAGES.SESSION_NOT_ACTIVE),

  streamNotStarted: () =>
    createErrorResponse(ErrorCode.AUDIO_STREAM_NOT_STARTED, ERROR_MESSAGES.AUDIO_STREAM_NOT_INITIALIZED),

  azureNotReady: () =>
    createErrorResponse(ErrorCode.AZURE_NOT_READY, ERROR_MESSAGES.AZURE_NOT_READY),

  audioDataInvalid: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.AUDIO_DATA_INVALID, ERROR_MESSAGES.INVALID_AUDIO_DATA_FORMAT, details),

  internalError: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, details),
};
