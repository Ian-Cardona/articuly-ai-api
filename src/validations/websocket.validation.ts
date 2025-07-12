import { ERROR_MESSAGES } from '../constants/error.constant.ts';

import type { WebSocketMessage } from '../types/websocket.type.ts';
import type { ParsedWebSocketMessage, ValidationResult } from '../types/validation.type.ts';

export const safeJsonParse = (
  jsonString: string,
): { success: true; data: ParsedWebSocketMessage } | { success: false; error: string } => {
  try {
    const parsed = JSON.parse(jsonString) as ParsedWebSocketMessage;
    return { success: true, data: parsed };
  } catch {
    return { success: false, error: ERROR_MESSAGES.INVALID_MESSAGE_FORMAT };
  }
};

const validateMessageStructure = (data: unknown): data is WebSocketMessage => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as Record<string, unknown>;

  if (typeof message.type !== 'string') {
    return false;
  }

  if (!message.payload || typeof message.payload !== 'object') {
    return false;
  }

  return true;
};

function hasNonEmptyStringProp(obj: unknown, prop: string): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>)[prop] === 'string' &&
    ((obj as Record<string, string>)[prop].trim().length > 0)
  );
}

const payloadValidators: Partial<Record<string, (payload: unknown) => string[]>> = {
  startSession: (payload) => {
    const errors: string[] = [];
    if (!hasNonEmptyStringProp(payload, 'exerciseText')) {
      errors.push(ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT);
    }
    return errors;
  },
  submitExercise: (payload) => {
    const errors: string[] = [];
    if (!hasNonEmptyStringProp(payload, 'exerciseText')) {
      errors.push(ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT);
    }
    return errors;
  },
  audioData: (payload) => {
    const errors: string[] = [];
    if (!hasNonEmptyStringProp(payload, 'audioBase64')) {
      errors.push(ERROR_MESSAGES.INVALID_AUDIO_DATA_FORMAT);
    }
    return errors;
  },
  stopSession: () => [],
  reconnect: (payload) => {
    const errors: string[] = [];
    if (!hasNonEmptyStringProp(payload, 'idToken')) {
      errors.push(ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT);
    }
    return errors;
  },
};

const validatePayload = (type: string, payload: unknown): { isValid: boolean; errors: string[] } => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: [ERROR_MESSAGES.INVALID_PAYLOAD_FORMAT] };
  }
  const validator = payloadValidators[type];
  if (!validator) {
    return {
      isValid: false,
      errors: [
        ERROR_MESSAGES.UNSUPPORTED_MESSAGE_TYPE(type),
      ],
    };
  }
  const errors = validator(payload);
  return { isValid: errors.length === 0, errors };
};

// Main validation function
export const validateWebSocketMessage = (messageString: string): ValidationResult => {
  // Validate input
  if (!messageString || typeof messageString !== 'string') {
    return {
      isValid: false,
      errors: [ERROR_MESSAGES.INVALID_MESSAGE_FORMAT],
    };
  }

  // Parse JSON safely
  const parseResult = safeJsonParse(messageString);
  if (!parseResult.success) {
    return {
      isValid: false,
      errors: [parseResult.error],
    };
  }

  // Validate message structure
  if (!validateMessageStructure(parseResult.data)) {
    return {
      isValid: false,
      errors: [ERROR_MESSAGES.INVALID_MESSAGE_FORMAT],
    };
  }

  const message = parseResult.data as WebSocketMessage;

  // Validate payload based on message type
  const payloadValidation = validatePayload(message.type, message.payload);
  if (!payloadValidation.isValid) {
    return {
      isValid: false,
      errors: payloadValidation.errors,
    };
  }

  return {
    isValid: true,
    errors: [],
    message,
  };
};
