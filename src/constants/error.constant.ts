export const ERROR_MESSAGES = {
  INVALID_MESSAGE_FORMAT: 'Invalid message format',
  AUTHENTICATION_FAILED: 'Authentication failed',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  INVALID_PAYLOAD_FORMAT: 'Invalid payload format',
  UNSUPPORTED_MESSAGE_TYPE: (messageType: string) => `Unsupported message type: ${messageType}`,
  SESSION_NOT_FOUND: 'Session not found',
  SESSION_NOT_ACTIVE: 'Session is not active',
  AUDIO_STREAM_NOT_INITIALIZED: 'Audio stream not initialized or missing context',
  AZURE_NOT_READY: 'Azure AI Speech connection not established or stream not ready',
  INVALID_AUDIO_DATA_FORMAT: 'Invalid audio data format',
  INTERNAL_SERVER_ERROR: 'Internal server error',
};
