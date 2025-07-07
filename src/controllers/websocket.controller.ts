import { validateWebSocketMessage, safeJsonParse } from '../validation/websocket.validation.ts';
import { azureSpeechService } from '../services/azure_speech.service.ts';
import { sessionUtils } from '../utils/session.utils.ts';
import { sessionStoreManager } from '../services/session_store.service.ts';
import { errorResponses } from '../types/error.type.ts';
import { createSessionResponse, createExerciseResponse } from '../utils/response.utils.ts';
import { ExerciseType } from '../types/session.type.ts';

import type { AuthenticatedWebSocket } from '../types/websocket.type.ts';
import type { WebSocketMessage, WebSocketPayload } from '../types/websocket.type.ts';

// WebSocket message handlers
const messageHandlers = {
  /**
   * Handle session start.
   */
  startSession: async (ws: AuthenticatedWebSocket, payload: WebSocketPayload): Promise<void> => {
    if (!ws.userId) {
      ws.send(JSON.stringify(errorResponses.unauthorized()));
      return;
    }

    if (payload.type !== 'startSession' || !payload.exerciseText) {
      ws.send(JSON.stringify(errorResponses.invalidPayload()));
      return;
    }

    try {
      // Get or create session
      let session = sessionStoreManager.getSession(ws.userId);
      const exerciseType = getExerciseTypeFromPayload(payload);

      if (!session) {
        session = sessionUtils.createSession({
          userId: ws.userId,
          exerciseType,
          expectedText: payload.exerciseText,
        });
        sessionStoreManager.setSession(ws.userId, session);
      }

      // Start session
      const startedSession = sessionUtils.startSession({
        session,
        exerciseType,
        expectedText: payload.exerciseText,
      });
      sessionStoreManager.setSession(ws.userId, startedSession);

      // Create Azure connection
      await azureSpeechService.createAzureConnection(ws, payload.exerciseText);

      // Validate exerciseConfig is not null
      if (!startedSession.state.exerciseConfig) {
        ws.send(JSON.stringify(errorResponses.internalError({
          operation: 'start_session',
          errorCode: 'NO_EXERCISE_CONFIG',
          errorDetails: 'Exercise config is missing after starting session.',
        })));
        return;
      }
      // Send success response
      ws.send(JSON.stringify(createSessionResponse(startedSession.state.exerciseConfig)));

      console.log(`Session started for user ${ws.userId} with exercise: "${payload.exerciseText}"`);
    } catch (error) {
      console.error(`Error starting session for user ${ws.userId}:`, error);
      ws.send(JSON.stringify(errorResponses.internalError({
        operation: 'start_session',
        errorCode: 'SESSION_START_FAILED',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      })));
    }
  },

  /**
   * Handle exercise submission.
   */
  submitExercise: async (ws: AuthenticatedWebSocket, payload: WebSocketPayload): Promise<void> => {
    if (!ws.userId) {
      ws.send(JSON.stringify(errorResponses.unauthorized()));
      return;
    }

    if (payload.type !== 'submitExercise' || !payload.exerciseText) {
      ws.send(JSON.stringify(errorResponses.invalidPayload()));
      return;
    }

    try {
      const session = sessionStoreManager.getSession(ws.userId);
      if (!session) {
        ws.send(JSON.stringify(errorResponses.sessionNotFound()));
        return;
      }

      // Stop current session if active
      let updatedSession = session;
      if (session.state.isActive) {
        updatedSession = sessionUtils.stopSession(session);
        sessionStoreManager.setSession(ws.userId, updatedSession);
      }

      // Start new session with new exercise
      const exerciseType = getExerciseTypeFromPayload(payload);
      updatedSession = sessionUtils.startSession({
        session: updatedSession,
        exerciseType,
        expectedText: payload.exerciseText,
      });
      sessionStoreManager.setSession(ws.userId, updatedSession);

      // Create new Azure connection
      await azureSpeechService.createAzureConnection(ws, payload.exerciseText);

      // Validate exerciseConfig is not null
      if (!updatedSession.state.exerciseConfig) {
        ws.send(JSON.stringify(errorResponses.internalError({
          operation: 'submit_exercise',
          errorCode: 'NO_EXERCISE_CONFIG',
          errorDetails: 'Exercise config is missing after submitting exercise.',
        })));
        return;
      }
      // Send success response
      ws.send(JSON.stringify(createExerciseResponse(updatedSession.state.exerciseConfig)));

      console.log(`Exercise submitted for user ${ws.userId}: "${payload.exerciseText}"`);
    } catch (error) {
      console.error(`Error submitting exercise for user ${ws.userId}:`, error);
      ws.send(JSON.stringify(errorResponses.internalError({
        operation: 'submit_exercise',
        errorCode: 'EXERCISE_SUBMIT_FAILED',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      })));
    }
  },

  // Handle audio data
  audioData: async (ws: AuthenticatedWebSocket, payload: WebSocketPayload): Promise<void> => {
    if (!ws.userId) {
      ws.send(JSON.stringify(errorResponses.unauthorized()));
      return;
    }

    if (payload.type !== 'audioData' || !payload.audioBase64) {
      ws.send(JSON.stringify(errorResponses.invalidPayload()));
      return;
    }

    try {
      const session = sessionStoreManager.getSession(ws.userId);
      if (!session?.state.isActive) {
        ws.send(JSON.stringify(errorResponses.sessionNotActive()));
        return;
      }

      // Send audio to Azure
      await azureSpeechService.sendAudioToAzure(ws.userId, payload.audioBase64);
    } catch (error) {
      console.error(`Error processing audio for user ${ws.userId}:`, error);
      ws.send(JSON.stringify(errorResponses.internalError({
        operation: 'audio_processing',
        errorCode: 'AUDIO_PROCESSING_FAILED',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      })));
    }
  },

  // Handle session stop
  stopSession: async (ws: AuthenticatedWebSocket, payload: WebSocketPayload): Promise<void> => {
    if (!ws.userId) {
      ws.send(JSON.stringify(errorResponses.unauthorized()));
      return;
    }

    if (payload.type !== 'stopSession') {
      ws.send(JSON.stringify(errorResponses.invalidPayload()));
      return;
    }

    try {
      const session = sessionStoreManager.getSession(ws.userId);
      if (!session) {
        ws.send(JSON.stringify(errorResponses.sessionNotFound()));
        return;
      }

      // Stop session
      const stoppedSession = sessionUtils.stopSession(session);
      sessionStoreManager.setSession(ws.userId, stoppedSession);

      // Close Azure connection
      await azureSpeechService.closeAzureConnection(ws.userId);

      // Clear Azure connection from session
      const cleanedSession = sessionUtils.clearAzureConnection(stoppedSession);
      sessionStoreManager.setSession(ws.userId, cleanedSession);

      console.log(`Session stopped for user ${ws.userId}`);
    } catch (error) {
      console.error(`Error stopping session for user ${ws.userId}:`, error);
      ws.send(JSON.stringify(errorResponses.internalError({
        operation: 'stop_session',
        errorCode: 'SESSION_STOP_FAILED',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      })));
    }
  },
};

// Main WebSocket message handler
export const handleWebSocketMessage = async (ws: AuthenticatedWebSocket, message: string): Promise<void> => {
  try {
    // Parse JSON safely and validate message format
    const parseResult = safeJsonParse(message);
    if (!parseResult.success) {
      ws.send(JSON.stringify(errorResponses.invalidMessage({ errors: [parseResult.error] })));
      return;
    }
    const validation = validateWebSocketMessage(message);
    if (!validation.isValid) {
      ws.send(JSON.stringify(errorResponses.invalidMessage({ errors: validation.errors })));
      return;
    }
    if (!validation.message) {
      ws.send(JSON.stringify(errorResponses.internalError({
        operation: 'message_handling',
        errorCode: 'NO_VALID_MESSAGE',
        errorDetails: 'Validation succeeded but message is missing.',
      })));
      return;
    }
    const parsedMessage: WebSocketMessage = validation.message;

    // Route to appropriate handler based on message type
    switch (parsedMessage.type) {
      case 'startSession':
        await messageHandlers.startSession(ws, parsedMessage.payload);
        break;
      case 'submitExercise':
        await messageHandlers.submitExercise(ws, parsedMessage.payload);
        break;
      case 'audioData':
        await messageHandlers.audioData(ws, parsedMessage.payload);
        break;
      case 'stopSession':
        await messageHandlers.stopSession(ws, parsedMessage.payload);
        break;
      default:
        ws.send(JSON.stringify(errorResponses.unsupportedMessageType('unknown')));
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
    ws.send(JSON.stringify(errorResponses.internalError({
      operation: 'message_handling',
      errorCode: 'MESSAGE_HANDLING_FAILED',
      errorDetails: error instanceof Error ? error.message : 'Unknown error',
    })));
  }
};

// WebSocket connection handlers
export const handleWebSocketConnection = (ws: AuthenticatedWebSocket): void => {
  console.log(`WebSocket connection established for user ${ws.userId}`);
};

export const handleWebSocketClose = async (ws: AuthenticatedWebSocket): Promise<void> => {
  if (ws.userId) {
    try {
      // Stop session if active
      const session = sessionStoreManager.getSession(ws.userId);
      if (session?.state.isActive) {
        const stoppedSession = sessionUtils.stopSession(session);
        sessionStoreManager.setSession(ws.userId, stoppedSession);
      }

      // Close Azure connection
      await azureSpeechService.closeAzureConnection(ws.userId);

      // Remove session
      sessionStoreManager.removeSession(ws.userId);

      console.log(`WebSocket connection closed and session cleaned up for user ${ws.userId}`);
    } catch (error) {
      console.error(`Error cleaning up session for user ${ws.userId}:`, error);
    }
  }
};

export const handleWebSocketError = async (ws: AuthenticatedWebSocket, error: Error): Promise<void> => {
  console.error(`WebSocket error for user ${ws.userId}:`, error);

  if (ws.userId) {
    try {
      // Clean up session on error
      await azureSpeechService.closeAzureConnection(ws.userId);
      sessionStoreManager.removeSession(ws.userId);
    } catch (cleanupError) {
      console.error(`Error during cleanup after WebSocket error for user ${ws.userId}:`, cleanupError);
    }
  }
};

function getExerciseTypeFromPayload(payload: WebSocketPayload): ExerciseType {
  if ('exerciseType' in payload && typeof payload.exerciseType === 'string' && Object.values(ExerciseType).includes(payload.exerciseType as ExerciseType)) {
    return payload.exerciseType as ExerciseType;
  }
  return ExerciseType.TongueTwister;
}
